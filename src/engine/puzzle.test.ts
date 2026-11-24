import { describe, expect, it } from 'vitest';
import { isUniqueSolution } from 'sudoku-core';
import { CELL_COUNT, createPuzzle, type Grid } from './puzzle';

/** 행·열·3×3 박스마다 1~9가 정확히 한 번씩 있는지 확인한다. */
function isValidSolution(grid: Grid): boolean {
  const units: number[][] = [];
  for (let i = 0; i < 9; i++) {
    const row: number[] = [];
    const col: number[] = [];
    const box: number[] = [];
    for (let j = 0; j < 9; j++) {
      row.push(i * 9 + j);
      col.push(j * 9 + i);
      box.push((Math.floor(i / 3) * 3 + Math.floor(j / 3)) * 9 + (i % 3) * 3 + (j % 3));
    }
    units.push(row, col, box);
  }
  return units.every((unit) => {
    const digits = new Set(unit.map((index) => grid[index]));
    return digits.size === 9 && [...digits].every((d) => d >= 1 && d <= 9);
  });
}

describe('createPuzzle', () => {
  const puzzle = createPuzzle('L1', 12345);

  it('81칸 보드를 만든다', () => {
    expect(puzzle.givens).toHaveLength(CELL_COUNT);
    expect(puzzle.solution).toHaveLength(CELL_COUNT);
  });

  it('정답이 스도쿠 규칙을 만족한다', () => {
    expect(isValidSolution(puzzle.solution)).toBe(true);
  });

  it('주어진 숫자가 모두 정답과 일치한다', () => {
    puzzle.givens.forEach((value, index) => {
      if (value !== 0) expect(value).toBe(puzzle.solution[index]);
    });
  });

  it('퍼즐의 해가 정확히 하나다', () => {
    const board = puzzle.givens.map((value) => (value === 0 ? null : value));
    expect(isUniqueSolution(board)).toBe(true);
  });

  it('같은 난이도와 seed는 같은 퍼즐을 만든다', () => {
    expect(createPuzzle('L1', 12345).givens).toEqual(puzzle.givens);
  });

  it('seed가 다르면 다른 퍼즐을 만든다', () => {
    expect(createPuzzle('L1', 54321).givens).not.toEqual(puzzle.givens);
  });
});
