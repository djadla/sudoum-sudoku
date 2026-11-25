import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_DIFFICULTY, levelOf, type DifficultyId } from './engine/difficulty';
import { randomSeed } from './engine/seed';
import {
  clearSavedGame,
  loadDifficulty,
  loadSavedGame,
  saveDifficulty,
  saveGame,
  toSavedGame,
} from './game/persistence';
import { createGame, restoreGame, type GameState } from './game/state';
import { useI18n } from './i18n/I18nProvider';
import { GenerationCancelledError, generatePuzzle } from './workers/generatePuzzle';
import { Game } from './ui/Game';
import { LanguageSelect } from './ui/LanguageSelect';
import { NewGameMenu } from './ui/NewGameMenu';

// 게임 이름은 번역하지 않는다. (ADR-0002)
const GAME_NAME = 'Sudoum Sudoku';

type Phase =
  | { readonly kind: 'loading'; readonly difficulty: DifficultyId }
  | { readonly kind: 'error'; readonly difficulty: DifficultyId }
  | { readonly kind: 'ready'; readonly difficulty: DifficultyId; readonly game: GameState };

/** 저장된 게임이 있으면 이어서 하고, 없으면 마지막으로 고른 난이도로 새 퍼즐을 만든다. */
function initialPhase(): Phase {
  const saved = loadSavedGame();
  if (saved) {
    return { kind: 'ready', difficulty: saved.difficulty, game: restoreGame(saved.puzzle, saved.values, saved.notes) };
  }
  return { kind: 'loading', difficulty: loadDifficulty() ?? DEFAULT_DIFFICULTY };
}

export function App() {
  const { t } = useI18n();
  const [phase, setPhase] = useState(initialPhase);
  // 새 게임을 연달아 요청하면 마지막 요청의 결과만 반영한다.
  const latestRequest = useRef(0);

  const startNewGame = useCallback((difficulty: DifficultyId) => {
    const request = ++latestRequest.current;
    saveDifficulty(difficulty);
    clearSavedGame();
    setPhase({ kind: 'loading', difficulty });
    generatePuzzle(levelOf(difficulty), randomSeed()).then(
      (puzzle) => {
        if (request === latestRequest.current) setPhase({ kind: 'ready', difficulty, game: createGame(puzzle) });
      },
      (error: unknown) => {
        if (error instanceof GenerationCancelledError || request !== latestRequest.current) return;
        console.warn('[game] 퍼즐 생성 실패', error);
        setPhase({ kind: 'error', difficulty });
      },
    );
  }, []);

  // 저장된 게임이 없어 로딩 상태로 시작했다면 첫 퍼즐을 만든다.
  useEffect(() => {
    if (phase.kind === 'loading' && latestRequest.current === 0) startNewGame(phase.difficulty);
  }, [phase, startNewGame]);

  const difficulty = phase.difficulty;
  // 완성한 게임은 이어할 필요가 없으므로 저장을 지운다. 다시 열면 같은 난이도의 새 퍼즐로 시작한다.
  const onGameChange = useCallback(
    (state: GameState) => {
      if (state.status === 'solved') clearSavedGame();
      else saveGame(toSavedGame(difficulty, state));
    },
    [difficulty],
  );

  return (
    <main className="app">
      <header className="app-header">
        <h1>{GAME_NAME}</h1>
        <LanguageSelect />
      </header>

      <div className="game-bar">
        <p className="meta">
          {phase.kind === 'ready'
            ? t('puzzle.meta', { difficulty: t(`difficulty.${difficulty}`), seed: phase.game.puzzle.seed })
            : t(`difficulty.${difficulty}`)}
        </p>
        <NewGameMenu current={difficulty} onNewGame={startNewGame} />
      </div>

      {phase.kind === 'ready' ? (
        <Game
          key={`${difficulty}:${phase.game.puzzle.seed}`}
          initialState={phase.game}
          onChange={onGameChange}
        />
      ) : (
        <div className="board-placeholder" role="status">
          {phase.kind === 'loading' ? (
            <p>{t('status.generating', { difficulty: t(`difficulty.${difficulty}`) })}</p>
          ) : (
            <>
              <p>{t('status.failed')}</p>
              <button type="button" className="tool compact" onClick={() => startNewGame(difficulty)}>
                {t('status.retry')}
              </button>
            </>
          )}
        </div>
      )}
    </main>
  );
}
