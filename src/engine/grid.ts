import type { House } from './hintTypes';
import { CELL_COUNT, type Grid } from './types';

export const rowOf = (index: number): number => Math.floor(index / 9);
export const colOf = (index: number): number => index % 9;
export const boxOf = (index: number): number => Math.floor(rowOf(index) / 3) * 3 + Math.floor(colOf(index) / 3);

export const indexOf = (row: number, col: number): number => row * 9 + col;

/** 같은 행·열·3×3 박스에 있는 다른 칸(자기 자신 제외, 칸마다 20개) */
const PEERS: readonly (readonly number[])[] = Array.from({ length: CELL_COUNT }, (_, index) =>
  Array.from({ length: CELL_COUNT }, (_, other) => other).filter(
    (other) =>
      other !== index &&
      (rowOf(other) === rowOf(index) || colOf(other) === colOf(index) || boxOf(other) === boxOf(index)),
  ),
);

export function peersOf(index: number): readonly number[] {
  return PEERS[index]!;
}

export function isPeer(a: number, b: number): boolean {
  return a !== b && (rowOf(a) === rowOf(b) || colOf(a) === colOf(b) || boxOf(a) === boxOf(b));
}

/** 행 9개, 열 9개, 박스 9개. 각 단위는 칸 번호 9개 */
export const UNITS: readonly (readonly number[])[] = [
  ...Array.from({ length: 9 }, (_, row) => Array.from({ length: 9 }, (_, col) => indexOf(row, col))),
  ...Array.from({ length: 9 }, (_, col) => Array.from({ length: 9 }, (_, row) => indexOf(row, col))),
  ...Array.from({ length: 9 }, (_, box) =>
    Array.from({ length: 9 }, (_, i) =>
      indexOf(Math.floor(box / 3) * 3 + Math.floor(i / 3), (box % 3) * 3 + (i % 3)),
    ),
  ),
];

/**
 * 같은 행·열·박스에 같은 숫자가 두 번 이상 있는 칸을 찾는다. (규칙 위반만 보며, 정답과는 비교하지 않는다)
 * 결과는 칸별 true/false 배열이다.
 */
export function findConflicts(values: Grid): boolean[] {
  const conflicts = Array<boolean>(CELL_COUNT).fill(false);
  for (const unit of UNITS) {
    const byDigit = new Map<number, number[]>();
    for (const index of unit) {
      const value = values[index]!;
      if (value === 0) continue;
      const cells = byDigit.get(value);
      if (cells) cells.push(index);
      else byDigit.set(value, [index]);
    }
    for (const cells of byDigit.values()) {
      if (cells.length > 1) for (const index of cells) conflicts[index] = true;
    }
  }
  return conflicts;
}

/** 모든 칸이 정답과 같으면 완성이다. 퍼즐의 해가 유일하므로 정답 비교로 충분하다. */
export function isSolved(values: Grid, solution: Grid): boolean {
  return values.every((value, index) => value === solution[index]);
}

/** 칸들이 모두 같은 행·열·박스 하나에 들어 있으면 그 단위를 돌려준다. (행 → 열 → 박스 순으로 찾는다) */
export function commonHouse(cells: readonly number[]): House | null {
  if (cells.length === 0) return null;
  const [first] = cells as [number, ...number[]];
  if (cells.every((cell) => rowOf(cell) === rowOf(first))) return { kind: 'row', index: rowOf(first) };
  if (cells.every((cell) => colOf(cell) === colOf(first))) return { kind: 'column', index: colOf(first) };
  if (cells.every((cell) => boxOf(cell) === boxOf(first))) return { kind: 'box', index: boxOf(first) };
  return null;
}

/**
 * 빈칸마다 같은 행·열·박스에 아직 없는 숫자(후보)를 비트 마스크로 돌려준다. 숫자 d는 비트 (1 << d).
 * 숫자가 있는 칸은 0이다. 규칙만으로 계산하는 기본 후보이며, 풀이 기법으로 더 좁히지는 않는다.
 */
export function candidateMasks(values: Grid): number[] {
  const ALL = 0b11_1111_1110;
  return values.map((value, index) => {
    if (value !== 0) return 0;
    let used = 0;
    for (const peer of peersOf(index)) used |= 1 << values[peer]!;
    return ALL & ~used;
  });
}
