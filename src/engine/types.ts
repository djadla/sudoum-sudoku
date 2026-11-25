import type { Difficulty } from 'sudoku-core';

// 퍼즐 생성 코드(sudoku-core)를 불러오지 않고도 쓸 수 있는 타입·상수.
// 생성은 Worker에서만 하므로, 메인 번들은 이 파일만 참조해 sudoku-core를 포함하지 않는다.

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
