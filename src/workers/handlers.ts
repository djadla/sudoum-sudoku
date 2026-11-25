import { computeHint } from '../engine/hint';
import { createPuzzle } from '../engine/puzzle';
import type { GenerateRequest, GenerateResponse, HintRequest, HintResponse } from './protocol';

// Worker와 Worker가 없는 환경의 대체 경로가 함께 쓰는 요청 처리. (sudoku-core 필요)

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

export function handleGenerate({ id, level, seed }: GenerateRequest): GenerateResponse {
  try {
    return { id, ok: true, puzzle: createPuzzle(level, seed) };
  } catch (error) {
    return { id, ok: false, error: message(error) };
  }
}

export function handleHint({ id, values, notes }: HintRequest): HintResponse {
  try {
    return { id, ok: true, hint: computeHint(values, notes) };
  } catch (error) {
    return { id, ok: false, error: message(error) };
  }
}
