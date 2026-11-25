import { describe, expect, it } from 'vitest';
import { createPuzzle } from '../engine/puzzle';
import { generatePuzzle } from './generatePuzzle';
import { handleGenerate } from './handlers';

describe('handleGenerate', () => {
  it('요청 id와 함께 퍼즐을 돌려준다', () => {
    const response = handleGenerate({ type: 'generate', id: 7, level: 'L2', seed: 99 });
    expect(response).toEqual({ id: 7, ok: true, puzzle: createPuzzle('L2', 99) });
  });

  it('생성에 실패하면 오류를 돌려준다', () => {
    const response = handleGenerate({ type: 'generate', id: 8, level: 'L99' as never, seed: 1 });
    expect(response.ok).toBe(false);
    expect(response.id).toBe(8);
  });
});

describe('generatePuzzle (Worker가 없는 환경)', () => {
  it('같은 스레드에서 같은 퍼즐을 만든다', async () => {
    expect(typeof Worker).toBe('undefined');
    await expect(generatePuzzle('L2', 99)).resolves.toEqual(createPuzzle('L2', 99));
  });

  it('생성에 실패하면 거부한다', async () => {
    await expect(generatePuzzle('L99' as never, 1)).rejects.toThrow();
  });
});

describe('requestHint (Worker가 없는 환경)', () => {
  it('같은 스레드에서 다음 힌트를 계산한다', async () => {
    const { requestHint } = await import('./requestHint');
    const puzzle = createPuzzle('L2', 99);
    const hint = await requestHint(puzzle.givens, Array(81).fill(0));
    expect(hint?.kind).toBe('technique');
  });

  it('연달아 요청하면 마지막 요청만 결과를 받는다', async () => {
    const { requestHint, HintSupersededError } = await import('./requestHint');
    const puzzle = createPuzzle('L2', 99);
    const first = requestHint(puzzle.givens, Array(81).fill(0));
    const second = requestHint(puzzle.solution, Array(81).fill(0));
    await expect(first).rejects.toBeInstanceOf(HintSupersededError);
    await expect(second).resolves.toBeNull(); // 완성된 보드
  });
});
