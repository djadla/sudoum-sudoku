import { describe, expect, it } from 'vitest';
import { boxOf, colOf, findConflicts, indexOf, isPeer, isSolved, peersOf, rowOf, UNITS } from './grid';
import { createPuzzle } from './puzzle';

describe('UNITS', () => {
  it('27개 단위가 각각 9칸이고, 모든 칸은 정확히 3개 단위(행·열·박스)에 속한다', () => {
    expect(UNITS).toHaveLength(27);
    const count = Array<number>(81).fill(0);
    for (const unit of UNITS) {
      expect(new Set(unit).size).toBe(9);
      for (const index of unit) count[index]!++;
    }
    expect(count.every((n) => n === 3)).toBe(true);
  });
});

describe('findConflicts', () => {
  const empty = () => Array<number>(81).fill(0);

  it('빈 보드와 정답에는 충돌이 없다', () => {
    expect(findConflicts(empty()).some(Boolean)).toBe(false);
    expect(findConflicts(createPuzzle('L1', 12345).solution).some(Boolean)).toBe(false);
  });

  it.each([
    ['같은 행', indexOf(0, 0), indexOf(0, 8)],
    ['같은 열', indexOf(0, 0), indexOf(8, 0)],
    ['같은 박스', indexOf(0, 0), indexOf(2, 2)],
  ])('%s의 같은 숫자는 두 칸 모두 충돌이다', (_, a, b) => {
    const values = empty();
    values[a] = 5;
    values[b] = 5;
    const conflicts = findConflicts(values);
    expect(conflicts[a]).toBe(true);
    expect(conflicts[b]).toBe(true);
    expect(conflicts.filter(Boolean)).toHaveLength(2);
  });

  it('다른 숫자이거나 서로 이웃이 아니면 충돌이 아니다', () => {
    const values = empty();
    values[indexOf(0, 0)] = 5;
    values[indexOf(0, 1)] = 6;
    values[indexOf(4, 4)] = 5;
    expect(findConflicts(values).some(Boolean)).toBe(false);
  });
});

describe('칸 위치', () => {
  it('행·열·박스 번호를 계산한다', () => {
    // 4행 5열(0부터) = index 41, 가운데 박스(4)
    expect(rowOf(41)).toBe(4);
    expect(colOf(41)).toBe(5);
    expect(boxOf(41)).toBe(4);
    expect(boxOf(0)).toBe(0);
    expect(boxOf(80)).toBe(8);
    expect(indexOf(4, 5)).toBe(41);
  });
});

describe('peersOf', () => {
  it('모든 칸은 자기 자신을 뺀 20개의 이웃을 가진다', () => {
    for (let index = 0; index < 81; index++) {
      const peers = peersOf(index);
      expect(peers).toHaveLength(20);
      expect(peers).not.toContain(index);
    }
  });

  it('isPeer와 같은 결과를 낸다', () => {
    expect(peersOf(0)).toContain(8); // 같은 행
    expect(peersOf(0)).toContain(72); // 같은 열
    expect(peersOf(0)).toContain(20); // 같은 박스 (2행 2열)
    expect(peersOf(0)).not.toContain(40);
    expect(isPeer(0, 40)).toBe(false);
    expect(isPeer(0, 0)).toBe(false);
  });
});

describe('isSolved', () => {
  const solution = Array.from({ length: 81 }, (_, i) => (i % 9) + 1);

  it('정답과 같으면 true', () => {
    expect(isSolved([...solution], solution)).toBe(true);
  });

  it('한 칸이라도 다르거나 비어 있으면 false', () => {
    const values = [...solution];
    values[10] = 0;
    expect(isSolved(values, solution)).toBe(false);
  });
});
