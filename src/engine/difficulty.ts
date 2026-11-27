import type { Difficulty } from 'sudoku-core';

/**
 * 화면에 보여 주는 난이도 5단계와 sudoku-core 레벨의 대응.
 * 레벨은 퍼즐을 푸는 데 필요한 가장 어려운 기법으로 매겨진다. (sudoku-core README)
 * - L2 숨은 싱글 / L3 단일 후보 / L5 드러난 쌍(+포인팅) / L7 Skyscraper·Two-String Kite 등 / L9 Jellyfish·체인 등
 * L1은 주어진 숫자가 60개 안팎이라 너무 쉬워서 쓰지 않는다.
 *
 * 2026-11-26: "보통이 너무 어렵다"는 피드백으로 보통~마스터를 한 단계씩 쉽게 옮겼다.
 * (이전: 보통 L4 / 어려움 L6 / 전문가 L8 / 마스터 L10 — 주어진 숫자가 L3 약 34개 → L4 약 25개로 크게 줄어 보통이 어려웠다)
 */
export const DIFFICULTY_LEVELS = {
  easy: 'L2',
  medium: 'L3',
  hard: 'L5',
  expert: 'L7',
  master: 'L9',
} as const satisfies Record<string, Difficulty>;

/**
 * 이전 대응표의 레벨. 대응을 바꾸기 전에 저장한 진행 중 게임을 버리지 않고 이어서 읽는 데 쓴다. (game/persistence.ts)
 */
export const LEGACY_DIFFICULTY_LEVELS: Readonly<Record<DifficultyId, readonly Difficulty[]>> = {
  easy: [],
  medium: ['L4'],
  hard: ['L6'],
  expert: ['L8'],
  master: ['L10'],
};

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

/** 퍼즐당 힌트 횟수. (ADR-0003) */
export const HINT_ALLOWANCE: Record<DifficultyId, number> = {
  easy: 0,
  medium: 1,
  hard: 3,
  expert: 5,
  master: 5,
};
