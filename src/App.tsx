import { useState } from 'react';
import { createPuzzle, randomSeed } from './engine/puzzle';
import { useI18n } from './i18n/I18nProvider';
import { LanguageSelect } from './ui/LanguageSelect';

// 게임 이름은 번역하지 않는다. (ADR-0002)
const GAME_NAME = 'Sudoum Sudoku';

// M0 골격: 엔진이 브라우저에서 동작하는지 확인하는 읽기 전용 보드.
// 입력·메모·완료 판정은 M1에서 붙인다.
export function App() {
  const { t } = useI18n();
  const [puzzle] = useState(() => createPuzzle('L1', randomSeed()));

  return (
    <main className="app">
      <header className="app-header">
        <h1>{GAME_NAME}</h1>
        <LanguageSelect />
      </header>
      <div className="board" role="grid" aria-label={t('board.label')} aria-readonly="true">
        {puzzle.givens.map((value, index) => {
          const position = { row: Math.floor(index / 9) + 1, col: (index % 9) + 1 };
          return (
            <div
              key={index}
              className="cell"
              role="gridcell"
              data-given={value !== 0}
              aria-label={
                value !== 0 ? t('board.cellFilled', { ...position, value }) : t('board.cellEmpty', position)
              }
            >
              {value !== 0 ? value : ''}
            </div>
          );
        })}
      </div>
      <p className="meta">{t('puzzle.meta', { level: puzzle.difficulty, seed: puzzle.seed })}</p>
    </main>
  );
}
