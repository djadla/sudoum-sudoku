import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_DIFFICULTY, HINT_ALLOWANCE, levelOf, type DifficultyId } from './engine/difficulty';
import { randomSeed } from './engine/seed';
import {
  clearSavedGame,
  loadDifficulty,
  loadShowCandidates,
  loadSavedGame,
  saveDifficulty,
  saveGame,
  toSavedGame,
} from './game/persistence';
import { createGame, restoreGame, type GameState } from './game/state';
import { useI18n } from './i18n/I18nProvider';
import { GenerationCancelledError, generatePuzzle } from './workers/generatePuzzle';
import { Game } from './ui/Game';
import { AppMenu } from './ui/AppMenu';
import { GuideDialog } from './ui/GuideDialog';
import type { LessonTarget } from './ui/guide/lessons';
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
    return {
      kind: 'ready',
      difficulty: saved.difficulty,
      game: { ...restoreGame(saved.puzzle, saved.values, saved.notes, saved.hintsLeft), showCandidates: loadShowCandidates() },
    };
  }
  return { kind: 'loading', difficulty: loadDifficulty() ?? DEFAULT_DIFFICULTY };
}

export function App() {
  const { t } = useI18n();
  const [phase, setPhase] = useState(initialPhase);
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideTarget, setGuideTarget] = useState<LessonTarget | null>(null);
  // 도움말을 연 요소. 닫으면 그곳으로 포커스를 돌려준다. (도움말 버튼 또는 힌트의 "이 기법 배우기")
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const openGuide = useCallback((target: LessonTarget | null) => {
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setGuideTarget(target);
    setGuideOpen(true);
  }, []);
  // 힌트 버튼을 넣을 자리 (Game이 portal로 채운다)
  const [hintSlot, setHintSlot] = useState<HTMLDivElement | null>(null);
  const guideButtonRef = useRef<HTMLButtonElement>(null);
  const closeGuide = useCallback(() => {
    setGuideOpen(false);
    // 닫으면 연 요소로 포커스를 돌려준다. 그 요소가 사라졌으면 도움말 버튼으로.
    const back = returnFocusRef.current;
    if (back?.isConnected) back.focus();
    else guideButtonRef.current?.focus();
  }, []);
  // 새 게임을 연달아 요청하면 마지막 요청의 결과만 반영한다.
  const latestRequest = useRef(0);

  const startNewGame = useCallback((difficulty: DifficultyId) => {
    const request = ++latestRequest.current;
    saveDifficulty(difficulty);
    clearSavedGame();
    setPhase({ kind: 'loading', difficulty });
    generatePuzzle(levelOf(difficulty), randomSeed()).then(
      (puzzle) => {
        if (request !== latestRequest.current) return;
        setPhase({
          kind: 'ready',
          difficulty,
          game: { ...createGame(puzzle, HINT_ALLOWANCE[difficulty]), showCandidates: loadShowCandidates() },
        });
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

  const meta = (
    <p className="meta">
      {phase.kind === 'ready'
        ? t('puzzle.meta', { difficulty: t(`difficulty.${difficulty}`), seed: phase.game.puzzle.seed })
        : t(`difficulty.${difficulty}`)}
    </p>
  );
  // 막대는 단계가 바뀌어도 같은 자리에 그려, 새 게임 메뉴가 다시 마운트되지 않게 한다.
  const newGameMenu = <NewGameMenu current={difficulty} onNewGame={startNewGame} />;

  return (
    <main className="app">
      <header className="app-header">
        <h1>{GAME_NAME}</h1>
        <div className="header-actions">
          {/* 좁은 화면에서도 헤더가 한 줄에 들어가도록 기호(?)만 보이고, 이름은 aria-label로 읽힌다. */}
          <button
            ref={guideButtonRef}
            type="button"
            className="tool icon"
            aria-label={t('guide.button')}
            title={t('guide.button')}
            aria-haspopup="dialog"
            onClick={() => openGuide(null)}
          >
            ?
          </button>
          <AppMenu />
        </div>
      </header>
      <GuideDialog open={guideOpen} onClose={closeGuide} target={guideTarget} />

      <div className="game-bar">
        {meta}
        <div ref={setHintSlot} className="hint-slot" />
        {newGameMenu}
      </div>

      {phase.kind === 'ready' ? (
        <Game
          key={`${difficulty}:${phase.game.puzzle.seed}`}
          initialState={phase.game}
          onChange={onGameChange}
          hintSlot={hintSlot}
          onLearn={openGuide}
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
