import type { PuzzleLevel } from '../engine/difficulty';
import type { Puzzle } from '../engine/types';
import type { GenerateRequest, GenerateResponse } from './protocol';

let worker: Worker | null = null;
let nextId = 1;
let pending: { id: number; reject: (error: Error) => void } | null = null;

/** 새 요청이 오면 진행 중인 생성은 결과를 기다리지 않고 버린다. */
export class GenerationCancelledError extends Error {
  constructor() {
    super('퍼즐 생성이 새 요청으로 취소되었습니다.');
    this.name = 'GenerationCancelledError';
  }
}

function settle(response: GenerateResponse, resolve: (puzzle: Puzzle) => void, reject: (error: Error) => void) {
  if (response.ok) resolve(response.puzzle);
  else reject(new Error(response.error));
}

/** Worker를 쓸 수 없는 환경(테스트, 오래된 브라우저)에서는 다음 틱에 같은 스레드에서 만든다. */
async function generateInline(request: GenerateRequest): Promise<Puzzle> {
  const { handleGenerate } = await import('./handlers');
  return new Promise((resolve, reject) => setTimeout(() => settle(handleGenerate(request), resolve, reject)));
}

/**
 * 퍼즐을 Web Worker에서 만든다.
 * 한 번에 하나만 만든다. 진행 중에 새로 요청하면 Worker를 종료해 이전 생성을 멈추고
 * 이전 요청은 GenerationCancelledError로 끝낸다.
 */
export function generatePuzzle(level: PuzzleLevel, seed: number): Promise<Puzzle> {
  const request: GenerateRequest = { type: 'generate', id: nextId++, level, seed };

  if (pending) {
    pending.reject(new GenerationCancelledError());
    pending = null;
    worker?.terminate();
    worker = null;
  }

  if (typeof Worker === 'undefined') return generateInline(request);

  return new Promise<Puzzle>((resolve, reject) => {
    worker ??= new Worker(new URL('./generate.worker.ts', import.meta.url), { type: 'module' });
    const current = worker;
    pending = { id: request.id, reject };

    const cleanup = () => {
      current.removeEventListener('message', onMessage);
      current.removeEventListener('error', onError);
      if (pending?.id === request.id) pending = null;
    };
    const onMessage = (event: MessageEvent<GenerateResponse>) => {
      if (event.data.id !== request.id) return;
      cleanup();
      settle(event.data, resolve, reject);
    };
    const onError = (event: ErrorEvent) => {
      cleanup();
      // Worker 스크립트를 불러오지 못하는 등 Worker 자체가 실패하면 다음 요청 때 새로 만든다.
      current.terminate();
      if (worker === current) worker = null;
      reject(new Error(event.message || '퍼즐 생성 Worker 오류'));
    };

    current.addEventListener('message', onMessage);
    current.addEventListener('error', onError);
    current.postMessage(request);
  });
}
