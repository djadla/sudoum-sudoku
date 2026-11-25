import type { PuzzleLevel } from '../engine/difficulty';
import type { HintView } from '../engine/hintTypes';
import type { Puzzle } from '../engine/types';

// 메인 스레드 ↔ Worker 메시지. 퍼즐 생성과 힌트 계산이 같은 Worker 스크립트를 쓴다.
// (요청마다 id를 붙여, 늦게 도착한 이전 요청의 응답을 구분한다)

export interface GenerateRequest {
  readonly type: 'generate';
  readonly id: number;
  readonly level: PuzzleLevel;
  readonly seed: number;
}

export type GenerateResponse =
  | { readonly id: number; readonly ok: true; readonly puzzle: Puzzle }
  | { readonly id: number; readonly ok: false; readonly error: string };

export interface HintRequest {
  readonly type: 'hint';
  readonly id: number;
  readonly values: readonly number[];
  readonly notes: readonly number[];
}

export type HintResponse =
  | { readonly id: number; readonly ok: true; readonly hint: HintView | null }
  | { readonly id: number; readonly ok: false; readonly error: string };

export type WorkerRequest = GenerateRequest | HintRequest;
export type WorkerResponse = GenerateResponse | HintResponse;
