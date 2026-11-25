import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// GitHub Pages 프로젝트 사이트(https://djadla.github.io/sudoum-sudoku/)에 맞춘 기본 경로.
// 모든 정적 자원 경로 앞에 붙는다. (ADR-0001)
export default defineConfig({
  base: '/sudoum-sudoku/',
  plugins: [react()],
  server: {
    port: 5173,
  },
  // 퍼즐 생성 Worker는 `new Worker(url, { type: 'module' })`로 띄우므로 ES 모듈로 빌드한다.
  worker: {
    format: 'es',
  },
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
