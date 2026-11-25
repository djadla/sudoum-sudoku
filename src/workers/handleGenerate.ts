import { createPuzzle } from '../engine/puzzle';
import type { GenerateRequest, GenerateResponse } from './protocol';

/** 생성 요청 하나를 처리한다. Worker와 Worker가 없는 환경의 대체 경로가 함께 쓴다. */
export function handleGenerate({ id, level, seed }: GenerateRequest): GenerateResponse {
  try {
    return { id, ok: true, puzzle: createPuzzle(level, seed) };
  } catch (error) {
    return { id, ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
