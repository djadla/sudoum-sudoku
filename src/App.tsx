import { useState } from 'react';
import { createPuzzle, randomSeed, type Puzzle } from './engine/puzzle';
import { useI18n } from './i18n/I18nProvider';
import { Game } from './ui/Game';
import { LanguageSelect } from './ui/LanguageSelect';

// 게임 이름은 번역하지 않는다. (ADR-0002)
const GAME_NAME = 'Sudoum Sudoku';

// M1: 난이도 선택은 M2에서 붙이므로 우선 L1 퍼즐 하나로 플레이한다.
const newPuzzle = (): Puzzle => createPuzzle('L1', randomSeed());

export function App() {
  const { t } = useI18n();
  const [puzzle, setPuzzle] = useState(newPuzzle);

  return (
    <main className="app">
      <header className="app-header">
        <h1>{GAME_NAME}</h1>
        <LanguageSelect />
      </header>
      <Game key={puzzle.seed} puzzle={puzzle} onNewPuzzle={() => setPuzzle(newPuzzle())} />
      <p className="meta">{t('puzzle.meta', { level: puzzle.difficulty, seed: puzzle.seed })}</p>
    </main>
  );
}
