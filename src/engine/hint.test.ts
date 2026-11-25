import { candidatesFromBoard, STRATEGY } from 'sudoku-core';
import { describe, expect, it } from 'vitest';
import { commonHouse, computeHint, tacticOf } from './hint';
import { TACTIC_KEYS, type HintView } from './hintTypes';
import { createPuzzle } from './puzzle';

const maskOf = (digits: readonly number[]) => digits.reduce((m, d) => m | (1 << d), 0);

/** 힌트를 보드에 반영한다. (게임의 applyHint와 같은 규칙: 메모가 없던 칸은 힌트가 본 후보로 채운 뒤 지운다) */
function apply(values: number[], notes: number[], hint: HintView): void {
  switch (hint.kind) {
    case 'technique':
      for (const { index, digit } of hint.placements) {
        values[index] = digit;
        notes[index] = 0;
      }
      for (const { index, digit } of hint.eliminations) {
        const base = notes[index] || hint.candidates[index]!;
        notes[index] = base & ~(1 << digit);
      }
      break;
    case 'impossibleNote':
      notes[hint.cell] = notes[hint.cell]! & ~(1 << hint.digit);
      break;
    case 'missingNote':
      notes[hint.cell] = notes[hint.cell]! | (1 << hint.digit);
      break;
    case 'wrongValue':
      values[hint.cell] = 0;
      break;
  }
}

describe('기법 매핑', () => {
  it('sudoku-core의 모든 기법(STRATEGY)을 기법 키로 바꿀 수 있다', () => {
    for (const strategy of Object.values(STRATEGY)) expect(tacticOf(strategy), strategy).not.toBeNull();
  });

  it('기법 키 목록과 매핑이 정확히 같다', () => {
    const mapped = Object.values(STRATEGY).map((s) => tacticOf(s));
    expect(new Set(mapped)).toEqual(new Set(TACTIC_KEYS));
    expect(mapped).toHaveLength(TACTIC_KEYS.length);
  });

  it('모르는 기법은 null', () => {
    expect(tacticOf('Brand New Strategy')).toBeNull();
  });
});

describe('commonHouse', () => {
  it('같은 행·열·박스를 찾는다', () => {
    expect(commonHouse([0, 8])).toEqual({ kind: 'row', index: 0 });
    expect(commonHouse([0, 72])).toEqual({ kind: 'column', index: 0 });
    expect(commonHouse([0, 20])).toEqual({ kind: 'box', index: 0 });
    expect(commonHouse([0, 40])).toBeNull();
    expect(commonHouse([])).toBeNull();
  });
});

describe('computeHint', () => {
  it('완성된 보드에는 힌트가 없다', () => {
    const puzzle = createPuzzle('L2', 11);
    expect(computeHint(puzzle.solution, Array(81).fill(0))).toBeNull();
  });

  it('들어갈 수 없는 메모를 먼저 알려 준다', () => {
    const puzzle = createPuzzle('L2', 11);
    const board = puzzle.givens.map((v) => (v === 0 ? null : v));
    const legal = candidatesFromBoard(board);
    const cell = puzzle.givens.findIndex((v, i) => v === 0 && legal[i]!.length < 9);
    const impossible = [1, 2, 3, 4, 5, 6, 7, 8, 9].find((d) => !legal[cell]!.includes(d))!;
    const notes = Array<number>(81).fill(0);
    notes[cell] = maskOf([...legal[cell]!, impossible]);
    expect(computeHint(puzzle.givens, notes)).toEqual({ kind: 'impossibleNote', cell, digit: impossible });
  });

  it('빠진 메모를 알려 준다', () => {
    const puzzle = createPuzzle('L2', 11);
    const board = puzzle.givens.map((v) => (v === 0 ? null : v));
    const legal = candidatesFromBoard(board);
    const cell = puzzle.givens.findIndex((v, i) => v === 0 && legal[i]!.length >= 2);
    const [missing, ...rest] = legal[cell]!;
    const notes = Array<number>(81).fill(0);
    notes[cell] = maskOf(rest);
    expect(computeHint(puzzle.givens, notes)).toEqual({ kind: 'missingNote', cell, digit: missing });
  });

  // 힌트만 따라가도 퍼즐을 끝까지 풀 수 있고, 힌트는 한 번도 틀린 숫자를 놓거나 정답 후보를 지우지 않는다.
  it.each([
    ['L2', 101],
    ['L4', 202],
    ['L6', 303],
  ] as const)('%s 퍼즐을 힌트만으로 정확히 푼다 (seed %i)', (level, seed) => {
    const puzzle = createPuzzle(level, seed);
    const values = [...puzzle.givens];
    const notes = Array<number>(81).fill(0);
    const tactics = new Set<string>();

    for (let step = 0; step < 500; step++) {
      const hint = computeHint(values, notes);
      if (!hint) break;
      if (hint.kind === 'technique') {
        tactics.add(hint.tactic);
        for (const { index, digit } of hint.placements) expect(digit, `칸 ${index}`).toBe(puzzle.solution[index]);
        for (const { index, digit } of hint.eliminations) expect(digit, `칸 ${index}`).not.toBe(puzzle.solution[index]);
        expect(hint.candidates).toHaveLength(81);
      }
      apply(values, notes, hint);
    }

    expect(values).toEqual(puzzle.solution);
    expect(tactics.size).toBeGreaterThan(0);
  });
});
