import { generate, getUniqueSolution, type Difficulty } from 'sudoku-core';

/** 81칸 보드. 0은 빈칸, 1~9는 숫자. 행 우선(row-major) 순서. */
export type Grid = readonly number[];

export interface Puzzle {
  /** 처음부터 주어진 숫자(빈칸은 0) */
  readonly givens: Grid;
  /** 유일한 정답 */
  readonly solution: Grid;
  readonly difficulty: Difficulty;
  readonly seed: number;
}

export const CELL_COUNT = 81;

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

/** 무작위 seed. 공유·재현에 쓰므로 32비트 양의 정수로 제한한다. */
export function randomSeed(): number {
  return Math.floor(Math.random() * 0x7fffffff) + 1;
}
