/// <reference lib="webworker" />
// 퍼즐 생성·힌트 계산 Worker. sudoku-core 계산이 화면(메인 스레드)을 막지 않도록 분리한다.
import { handleGenerate, handleHint } from './handlers';
import type { WorkerRequest } from './protocol';

declare const self: DedicatedWorkerGlobalScope;

self.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  self.postMessage(request.type === 'hint' ? handleHint(request) : handleGenerate(request));
});
