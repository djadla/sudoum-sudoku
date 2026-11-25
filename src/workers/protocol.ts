import type { PuzzleLevel } from '../engine/difficulty';
import type { Puzzle } from '../engine/types';

/** 메인 스레드 → 생성 Worker */
export interface GenerateRequest {
  readonly id: number;
  readonly level: PuzzleLevel;
  readonly seed: number;
}

/** 생성 Worker → 메인 스레드 */
export type GenerateResponse =
  | { readonly id: number; readonly ok: true; readonly puzzle: Puzzle }
  | { readonly id: number; readonly ok: false; readonly error: string };
