/// <reference lib="webworker" />
// 퍼즐 생성 Worker. 높은 난이도는 생성에 수 초가 걸릴 수 있어 메인 스레드(화면)를 막지 않도록 분리한다.
import { handleGenerate } from './handleGenerate';
import type { GenerateRequest } from './protocol';

declare const self: DedicatedWorkerGlobalScope;

self.addEventListener('message', (event: MessageEvent<GenerateRequest>) => {
  self.postMessage(handleGenerate(event.data));
});
