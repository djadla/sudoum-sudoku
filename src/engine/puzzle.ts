import { generate, getUniqueSolution, type Difficulty } from 'sudoku-core';
import type { Puzzle } from './types';

export { CELL_COUNT, type Grid, type Puzzle } from './types';

/**
 * 해가 정확히 하나인 퍼즐을 만든다.
 * 같은 difficulty와 seed는 어느 기기에서나 같은 퍼즐을 만든다.
 */
export function createPuzzle(difficulty: Difficulty, seed: number): Puzzle {
  const board = generate(difficulty, { seed });
  const solution = getUniqueSolution(board);
  if (!solution) {
    // sudoku-core는 유일해 퍼즐만 반환하지만, 정답 없는 퍼즐로 게임을 시작하지 않도록 막는다.
    throw new Error(`유일한 해가 없는 퍼즐이 생성되었습니다. (difficulty=${difficulty}, seed=${seed})`);
  }
  return {
    givens: board.map((value) => value ?? 0),
    solution,
    difficulty,
    seed,
  };
}
