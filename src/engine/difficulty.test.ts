import { analyze } from 'sudoku-core';
import { describe, expect, it } from 'vitest';
import { DEFAULT_DIFFICULTY, DIFFICULTY_IDS, isDifficultyId, levelOf } from './difficulty';
import { createPuzzle } from './puzzle';

describe('난이도', () => {
  it('5단계를 쉬운 순서로 정의한다', () => {
    expect(DIFFICULTY_IDS).toEqual(['easy', 'medium', 'hard', 'expert', 'master']);
    expect(DIFFICULTY_IDS.map(levelOf)).toEqual(['L2', 'L4', 'L6', 'L8', 'L10']);
    expect(DEFAULT_DIFFICULTY).toBe('easy');
  });

  it('난이도 id를 검사한다', () => {
    expect(isDifficultyId('hard')).toBe(true);
    expect(isDifficultyId('L6')).toBe(false);
    expect(isDifficultyId('toString')).toBe(false);
    expect(isDifficultyId(undefined)).toBe(false);
  });

  // 생성이 가장 빠른 두 단계로 실제 레벨이 맞는지 확인한다. (높은 단계는 생성에 수 초가 걸릴 수 있다)
  it.each(['easy', 'medium'] as const)('%s 퍼즐은 요청한 레벨로 평가된다', (id) => {
    const puzzle = createPuzzle(levelOf(id), 2026);
    const board = puzzle.givens.map((value) => (value === 0 ? null : value));
    expect(analyze(board).difficulty).toBe(levelOf(id));
  });
});
