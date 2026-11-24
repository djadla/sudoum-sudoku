import { useState } from 'react';
import { createPuzzle, randomSeed } from './engine/puzzle';

// M0 골격: 엔진이 브라우저에서 동작하는지 확인하는 읽기 전용 보드.
// 입력·메모·완료 판정은 M1, 화면 문자열 다국어 처리는 다음 단계에서 붙인다.
export function App() {
  const [puzzle] = useState(() => createPuzzle('L1', randomSeed()));

  return (
    <main className="app">
      <h1>Sudoum Sudoku</h1>
      <div className="board" role="grid" aria-label="Sudoku board" aria-readonly="true">
        {puzzle.givens.map((value, index) => (
          <div key={index} className="cell" role="gridcell" data-given={value !== 0}>
            {value !== 0 ? value : ''}
          </div>
        ))}
      </div>
      <p className="meta">
        {puzzle.difficulty} · seed {puzzle.seed}
      </p>
    </main>
  );
}
