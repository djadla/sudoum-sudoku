import type { HintView } from '../engine/hintTypes';
import type { HintRequest, HintResponse } from './protocol';

// 힌트 계산 요청. 퍼즐 생성과 같은 Worker 스크립트를 쓰지만 인스턴스는 따로 두어,
// 퍼즐을 만드는 중에도 힌트를 계산할 수 있고 서로의 취소에 영향을 주지 않는다. (ADR-0003 6번)

let worker: Worker | null = null;
let nextId = 1;
let latestId = 0;

/** 더 새 힌트 요청이 와서 이전 요청의 결과를 버렸다. */
export class HintSupersededError extends Error {
  constructor() {
    super('더 새 힌트 요청으로 이전 요청을 버렸습니다.');
    this.name = 'HintSupersededError';
  }
}

function settle(response: HintResponse, resolve: (hint: HintView | null) => void, reject: (error: Error) => void) {
  if (response.ok) resolve(response.hint);
  else reject(new Error(response.error));
}

async function computeInline(request: HintRequest): Promise<HintView | null> {
  const { handleHint } = await import('./handlers');
  return new Promise((resolve, reject) => setTimeout(() => settle(handleHint(request), resolve, reject)));
}

/**
 * 다음 힌트를 Worker에서 계산한다. 적용할 힌트가 없으면 null.
 * 연달아 요청하면 마지막 요청만 결과를 받고, 이전 요청은 HintSupersededError로 끝난다.
 */
export function requestHint(values: readonly number[], notes: readonly number[]): Promise<HintView | null> {
  const request: HintRequest = { type: 'hint', id: nextId++, values: [...values], notes: [...notes] };
  latestId = request.id;

  const guard = (promise: Promise<HintView | null>) =>
    promise.then((hint) => {
      if (request.id !== latestId) throw new HintSupersededError();
      return hint;
    });

  if (typeof Worker === 'undefined') return guard(computeInline(request));

  return guard(
    new Promise<HintView | null>((resolve, reject) => {
      worker ??= new Worker(new URL('./generate.worker.ts', import.meta.url), { type: 'module' });
      const current = worker;
      const cleanup = () => {
        current.removeEventListener('message', onMessage);
        current.removeEventListener('error', onError);
      };
      const onMessage = (event: MessageEvent<HintResponse>) => {
        if (event.data.id !== request.id) return;
        cleanup();
        settle(event.data, resolve, reject);
      };
      const onError = (event: ErrorEvent) => {
        cleanup();
        // Worker 자체가 실패하면 다음 요청 때 새로 만든다.
        current.terminate();
        if (worker === current) worker = null;
        reject(new Error(event.message || '힌트 계산 Worker 오류'));
      };
      current.addEventListener('message', onMessage);
      current.addEventListener('error', onError);
      current.postMessage(request);
    }),
  );
}
