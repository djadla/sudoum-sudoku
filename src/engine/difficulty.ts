import type { Difficulty } from 'sudoku-core';

/**
 * 화면에 보여 주는 난이도 5단계와 sudoku-core 레벨의 대응.
 * 레벨은 퍼즐을 푸는 데 필요한 가장 어려운 기법으로 매겨진다. (sudoku-core README)
 * - L2 숨은 싱글 / L4 포인팅 / L6 페어·X-Wing 등 / L8 Y-Wing 등 / L10 체인
 * L1은 주어진 숫자가 60개 안팎이라 너무 쉬워서 쓰지 않는다.
 */
export const DIFFICULTY_LEVELS = {
  easy: 'L2',
  medium: 'L4',
  hard: 'L6',
  expert: 'L8',
  master: 'L10',
} as const satisfies Record<string, Difficulty>;

export type DifficultyId = keyof typeof DIFFICULTY_LEVELS;
export type PuzzleLevel = (typeof DIFFICULTY_LEVELS)[DifficultyId];

export const DIFFICULTY_IDS = Object.keys(DIFFICULTY_LEVELS) as DifficultyId[];

export const DEFAULT_DIFFICULTY: DifficultyId = 'easy';

export function isDifficultyId(value: unknown): value is DifficultyId {
  return typeof value === 'string' && Object.hasOwn(DIFFICULTY_LEVELS, value);
}

export function levelOf(id: DifficultyId): PuzzleLevel {
  return DIFFICULTY_LEVELS[id];
}
