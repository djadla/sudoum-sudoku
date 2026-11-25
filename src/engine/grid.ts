import { CELL_COUNT, type Grid } from './puzzle';

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

/** 모든 칸이 정답과 같으면 완성이다. 퍼즐의 해가 유일하므로 정답 비교로 충분하다. */
export function isSolved(values: Grid, solution: Grid): boolean {
  return values.every((value, index) => value === solution[index]);
}
