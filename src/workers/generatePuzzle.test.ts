import { describe, expect, it, vi } from 'vitest';
import { createPuzzle } from '../engine/puzzle';

// 잘못된 레벨을 넣으면 sudoku-core는 제한 시간까지 생성을 시도해 수 초가 걸린다. (CI 시간 초과 원인)
// 실패 처리만 확인하면 되므로, 이 레벨에서는 바로 실패하도록 바꾼다.
const FAILING_LEVEL = 'L99' as never;
vi.mock('../engine/puzzle', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../engine/puzzle')>();
  return {
    ...actual,
    createPuzzle: (level: Parameters<typeof actual.createPuzzle>[0], seed: number) => {
      if (level === FAILING_LEVEL) throw new Error('생성 실패 (테스트)');
      return actual.createPuzzle(level, seed);
    },
  };
});
import { generatePuzzle } from './generatePuzzle';
import { handleGenerate } from './handlers';

describe('handleGenerate', () => {
  it('요청 id와 함께 퍼즐을 돌려준다', () => {
    const response = handleGenerate({ type: 'generate', id: 7, level: 'L2', seed: 99 });
    expect(response).toEqual({ id: 7, ok: true, puzzle: createPuzzle('L2', 99) });
  });

  it('생성에 실패하면 오류를 돌려준다', () => {
    const response = handleGenerate({ type: 'generate', id: 8, level: FAILING_LEVEL, seed: 1 });
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
    await expect(generatePuzzle(FAILING_LEVEL, 1)).rejects.toThrow('생성 실패');
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
