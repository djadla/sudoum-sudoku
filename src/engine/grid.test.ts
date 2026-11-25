import { describe, expect, it } from 'vitest';
import { boxOf, colOf, indexOf, isPeer, isSolved, peersOf, rowOf } from './grid';

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
