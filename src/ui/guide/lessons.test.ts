import { describe, expect, it } from 'vitest';
import { candidateMasks, findConflicts } from '../../engine/grid';
import { translate } from '../../i18n';
import en from '../../i18n/locales/en';
import ko from '../../i18n/locales/ko';
import { ADVANCED_LESSONS, ALL_LESSONS, BASIC_LESSONS, lessonForHint, type CellDigit, type Lesson } from './lessons';
import { TACTIC_KEYS, type HintView, type TacticKey } from '../../engine/hintTypes';
import { isPeer } from '../../engine/grid';

const digitsOf = (mask: number) => [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => mask & (1 << d));

/** 예제가 설명하는 결론이 규칙상 실제로 성립하는지 검사한다. */
function verifyClaim(lesson: Lesson) {
  const { values, claim } = lesson;
  const masks = candidateMasks(values);
  switch (claim.kind) {
    case 'openSingle': {
      const empties = claim.house.filter((i) => values[i] === 0);
      expect(empties).toEqual([claim.index]);
      const present = claim.house.map((i) => values[i]).filter(Boolean);
      expect([1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => !present.includes(d))).toEqual([claim.digit]);
      break;
    }
    case 'hiddenSingle': {
      expect(claim.house.some((i) => values[i] === claim.digit)).toBe(false);
      const spots = claim.house.filter((i) => values[i] === 0 && digitsOf(masks[i]!).includes(claim.digit));
      expect(spots).toEqual([claim.index]);
      break;
    }
    case 'candidates':
      expect(values[claim.index]).toBe(0);
      expect(digitsOf(masks[claim.index]!)).toEqual([...claim.digits]);
      break;
    default:
      verifyAdvanced(lesson);
  }
}

const has = (notes: Readonly<Record<number, readonly number[]>>, cell: number, digit: number) =>
  (notes[cell] ?? []).includes(digit);
const key = ({ index, digit }: CellDigit) => `${index}:${digit}`;
const sortedKeys = (list: readonly CellDigit[]) => list.map(key).sort();

/**
 * 고급 기법의 조건을 예제 후보로 그대로 검사한다.
 * 지우는 후보(eliminations)는 "기법이 지울 수 있는 후보 전부"와 정확히 같아야 한다.
 */
function verifyAdvanced(lesson: Lesson) {
  const { values, claim } = lesson;
  const notes = lesson.notes ?? {};
  const empty = (cell: number) => values[cell] === 0;
  // 기법이 보는 단위의 빈칸은 모두 후보를 보여 줘야 판단이 보인다.
  const shown = (unit: readonly number[]) => {
    for (const cell of unit) if (empty(cell)) expect(notes[cell], `칸 ${cell}에 후보가 없다`).toBeDefined();
  };
  const holders = (unit: readonly number[], digit: number) => unit.filter((cell) => empty(cell) && has(notes, cell, digit));
  /** 목록에 중복이 없고 개수가 맞는지 (잘못된 패턴 데이터가 검증을 통과하지 않게) */
  const distinct = (list: readonly number[], size: number, what: string) => {
    expect(new Set(list).size, `${what} 중복`).toBe(list.length);
    expect(list.length, `${what} 개수`).toBe(size);
  };
  const unitSize = (unit: readonly number[]) => distinct(unit, 9, '단위 칸');
  // 지울 후보에도 중복이 없어야 한다.
  expect(new Set(claim.kind === 'openSingle' || claim.kind === 'hiddenSingle' || claim.kind === 'candidates' ? [] : claim.eliminations.map(key)).size).toBe(
    'eliminations' in claim ? claim.eliminations.length : 0,
  );

  switch (claim.kind) {
    case 'claiming': {
      unitSize(claim.line);
      unitSize(claim.box);
      expect(claim.box.filter((cell) => claim.line.includes(cell))).toHaveLength(3);
      shown(claim.line);
      shown(claim.box);
      const spots = holders(claim.line, claim.digit);
      expect(spots.length).toBeGreaterThanOrEqual(2);
      expect(spots.every((cell) => claim.box.includes(cell))).toBe(true);
      const expected = holders(claim.box, claim.digit)
        .filter((cell) => !claim.line.includes(cell))
        .map((index) => ({ index, digit: claim.digit }));
      expect(sortedKeys(claim.eliminations)).toEqual(sortedKeys(expected));
      break;
    }
    case 'pointing': {
      unitSize(claim.box);
      unitSize(claim.line);
      // 박스와 줄은 정확히 3칸이 겹친다. (같은 박스를 지나는 행 또는 열)
      expect(claim.box.filter((cell) => claim.line.includes(cell))).toHaveLength(3);
      shown(claim.box);
      shown(claim.line);
      const spots = holders(claim.box, claim.digit);
      expect(spots.length).toBeGreaterThanOrEqual(2);
      expect(spots.every((cell) => claim.line.includes(cell))).toBe(true);
      const expected = holders(claim.line, claim.digit)
        .filter((cell) => !claim.box.includes(cell))
        .map((index) => ({ index, digit: claim.digit }));
      expect(sortedKeys(claim.eliminations)).toEqual(sortedKeys(expected));
      break;
    }
    case 'nakedSubset': {
      unitSize(claim.unit);
      // 쌍·세 쌍·네 쌍: 2~4칸
      expect(claim.cells.length >= 2 && claim.cells.length <= 4).toBe(true);
      distinct(claim.cells, claim.cells.length, '패턴 칸');
      shown(claim.unit);
      const union = new Set(claim.cells.flatMap((cell) => notes[cell] ?? []));
      expect(union.size).toBe(claim.cells.length);
      expect(claim.cells.every((cell) => claim.unit.includes(cell) && empty(cell))).toBe(true);
      const expected = claim.unit
        .filter((cell) => empty(cell) && !claim.cells.includes(cell))
        .flatMap((index) => (notes[index] ?? []).filter((d) => union.has(d)).map((digit) => ({ index, digit })));
      expect(sortedKeys(claim.eliminations)).toEqual(sortedKeys(expected));
      break;
    }
    case 'hiddenSubset': {
      unitSize(claim.unit);
      expect(claim.cells.length >= 2 && claim.cells.length <= 4).toBe(true);
      distinct(claim.cells, claim.cells.length, '패턴 칸');
      // 숨은 쌍·세 쌍: 숫자 수 = 칸 수
      distinct(claim.digits, claim.cells.length, '패턴 숫자');
      expect(claim.cells.every((cell) => claim.unit.includes(cell) && empty(cell))).toBe(true);
      shown(claim.unit);
      for (const digit of claim.digits) expect(holders(claim.unit, digit).sort()).toEqual([...claim.cells].sort());
      const expected = claim.cells.flatMap((index) =>
        (notes[index] ?? []).filter((d) => !claim.digits.includes(d)).map((digit) => ({ index, digit })),
      );
      expect(sortedKeys(claim.eliminations)).toEqual(sortedKeys(expected));
      break;
    }
    case 'xWing': {
      expect(claim.bases).toHaveLength(2);
      expect(claim.covers).toHaveLength(2);
      [...claim.bases, ...claim.covers].forEach(unitSize);
      // 기준선 두 개는 서로 겹치지 않는 평행한 줄이고, 각 기준선과 교차선은 한 칸에서 만난다.
      expect(claim.bases[0]!.some((cell) => claim.bases[1]!.includes(cell))).toBe(false);
      expect(claim.covers[0]!.some((cell) => claim.covers[1]!.includes(cell))).toBe(false);
      for (const base of claim.bases) for (const cover of claim.covers) {
        expect(base.filter((cell) => cover.includes(cell))).toHaveLength(1);
      }
      claim.bases.forEach(shown);
      for (const base of claim.bases) {
        const spots = holders(base, claim.digit);
        expect(spots).toHaveLength(2);
        // 두 자리는 각각 서로 다른 cover 줄에 있다.
        expect(claim.covers.map((cover) => spots.filter((cell) => cover.includes(cell)).length)).toEqual([1, 1]);
      }
      const corners = claim.bases.flat();
      const expected = claim.covers
        .flat()
        .filter((cell) => !corners.includes(cell) && empty(cell) && has(notes, cell, claim.digit))
        .map((index) => ({ index, digit: claim.digit }));
      expect(sortedKeys(claim.eliminations)).toEqual(sortedKeys(expected));
      break;
    }
    case 'yWing': {
      const [a, b] = claim.wings;
      const pivot = notes[claim.pivot] ?? [];
      const wa = notes[a] ?? [];
      const wb = notes[b] ?? [];
      expect([pivot.length, wa.length, wb.length]).toEqual([2, 2, 2]);
      expect(isPeer(claim.pivot, a) && isPeer(claim.pivot, b)).toBe(true);
      expect(isPeer(a, b)).toBe(false);
      expect(new Set([claim.pivot, a, b]).size).toBe(3);
      const [x, y] = pivot as [number, number];
      expect(x).not.toBe(y);
      // 날개는 {x, z}와 {y, z}
      expect(wa.includes(x) && wa.includes(claim.digit)).toBe(true);
      expect(wb.includes(y) && wb.includes(claim.digit)).toBe(true);
      expect(pivot.includes(claim.digit)).toBe(false);
      const expected = Object.keys(notes)
        .map(Number)
        .filter((cell) => cell !== a && cell !== b && isPeer(cell, a) && isPeer(cell, b) && has(notes, cell, claim.digit))
        .map((index) => ({ index, digit: claim.digit }));
      expect(expected.length).toBeGreaterThan(0);
      expect(sortedKeys(claim.eliminations)).toEqual(sortedKeys(expected));
      break;
    }
    default:
      throw new Error(`검사하지 않은 claim: ${claim.kind}`);
  }
}

describe.each(ALL_LESSONS.map((lesson) => [lesson.id, lesson] as const))('풀이 설명: %s', (_, lesson) => {
  it('예제 보드는 규칙을 어기지 않는다 (같은 행·열·박스에 같은 숫자 없음)', () => {
    expect(lesson.values).toHaveLength(81);
    expect(findConflicts(lesson.values).some(Boolean)).toBe(false);
  });

  it('설명하는 결론이 규칙상 성립한다', () => {
    verifyClaim(lesson);
  });

  it('단계에서 가리키는 칸은 모두 보드 안이고, 채우는 숫자는 빈칸에 결론과 같은 숫자다', () => {
    for (const frame of lesson.frames) {
      const cells = [
        ...(frame.region ?? []),
        ...(frame.shade ?? []),
        ...(frame.pattern ?? []),
        ...(frame.focus !== undefined ? [frame.focus] : []),
        ...Object.keys(frame.notes ?? {}).map(Number),
      ];
      for (const cell of cells) expect(cell >= 0 && cell < 81, `${cell}`).toBe(true);
      if (frame.place) {
        const { claim } = lesson;
        expect(lesson.values[frame.place.index]).toBe(0);
        if (claim.kind === 'openSingle' || claim.kind === 'hiddenSingle') {
          expect(frame.place).toEqual({ index: claim.index, digit: claim.digit });
        } else if (claim.kind === 'candidates') {
          expect(claim.digits).toEqual([frame.place.digit]);
        } else {
          throw new Error('고급 설명은 숫자를 채우지 않는다');
        }
      }
      const shownNotes = { ...(lesson.notes ?? {}), ...(frame.notes ?? {}) };
      const legal = candidateMasks(lesson.values);
      for (const [cell, digits] of Object.entries(shownNotes)) {
        const index = Number(cell);
        expect(lesson.values[index], `숫자가 있는 칸 ${index}에 후보`).toBe(0);
        if (!lesson.notes) {
          // 기본 풀이: 보여 주는 후보는 실제 후보와 같다.
          expect([...digits]).toEqual(digitsOf(legal[index]!));
        } else {
          // 고급 풀이: "후보가 이렇게 남아 있다"고 가정하므로, 보드의 숫자와 모순되지 않기만 하면 된다.
          for (const digit of digits) expect(digitsOf(legal[index]!), `칸 ${index}의 후보 ${digit}`).toContain(digit);
        }
      }
      // 강조·취소선은 보이는 후보에만 긋는다. 취소선은 결론의 지울 후보와 같다.
      for (const { index, digit } of [...(frame.mark ?? []), ...(frame.strike ?? [])]) {
        expect(shownNotes[index] ?? [], `칸 ${index}의 ${digit}`).toContain(digit);
      }
      if (frame.strike && 'eliminations' in lesson.claim) {
        expect(sortedKeys(frame.strike)).toEqual(sortedKeys(lesson.claim.eliminations));
      }
    }
  });

  it.each([
    ['en', en],
    ['ko', ko],
  ] as const)('%s: 제목·요약·단계 설명이 모두 있다', (_, messages) => {
    for (const key of [lesson.title, lesson.summary, ...lesson.frames.map((f) => f.caption)]) {
      const text = translate(messages, key);
      expect(text, key).not.toBe(key);
      expect(text.trim(), key).not.toBe('');
    }
  });
});

describe('숨은 싱글 예제', () => {
  // 빗금은 "이 숫자가 들어갈 수 없는 칸"이다. 단계마다 빗금 친 빈칸에 정말 그 숫자가 못 들어가는지 확인한다.
  it('모든 단계에서 빗금 친 빈칸에는 그 숫자가 들어갈 수 없다', () => {
    const lesson = BASIC_LESSONS.find((l) => l.id === 'hiddenSingle')!;
    if (lesson.claim.kind !== 'hiddenSingle') throw new Error('claim');
    const masks = candidateMasks(lesson.values);
    const { digit } = lesson.claim;
    for (const frame of lesson.frames) {
      for (const cell of frame.shade ?? []) {
        if (lesson.values[cell] !== 0) continue;
        expect(digitsOf(masks[cell]!), `칸 ${cell}`).not.toContain(digit);
      }
    }
  });

  it('2단계는 2·3행 전체, 3단계는 2·3행과 2·3열 전체를 빗금 친다 (설명 문장과 일치)', () => {
    const lesson = BASIC_LESSONS.find((l) => l.id === 'hiddenSingle')!;
    const [, s2, s3] = lesson.frames;
    const cells = (pred: (row: number, col: number) => boolean) =>
      Array.from({ length: 81 }, (_, i) => i).filter((i) => pred(Math.floor(i / 9) + 1, (i % 9) + 1));
    const sorted = (list: readonly number[]) => [...new Set(list)].sort((a, b) => a - b);
    expect(sorted(s2!.shade!)).toEqual(cells((r) => r === 2 || r === 3));
    expect(sorted(s3!.shade!)).toEqual(cells((r, c) => r === 2 || r === 3 || c === 2 || c === 3));
  });

  it('마지막 단계에서 지운 칸은 박스의 다른 빈칸 전부다 (남는 칸이 정말 하나)', () => {
    const lesson = BASIC_LESSONS.find((l) => l.id === 'hiddenSingle')!;
    const last = lesson.frames.at(-1)!;
    const { claim } = lesson;
    if (claim.kind !== 'hiddenSingle') throw new Error('claim');
    const emptyOthers = claim.house.filter((i) => lesson.values[i] === 0 && i !== claim.index);
    for (const cell of emptyOthers) expect(last.shade).toContain(cell);
    expect(last.shade).not.toContain(claim.index);
  });
});

describe('고급 풀이', () => {
  it('지운 뒤 단계의 후보는 처음 후보에서 지울 후보만 뺀 것이다', () => {
    for (const lesson of ADVANCED_LESSONS) {
      if (!('eliminations' in lesson.claim)) continue;
      const removed = new Set(lesson.claim.eliminations.map(key));
      for (const frame of lesson.frames) {
        for (const [cell, digits] of Object.entries(frame.notes ?? {})) {
          const before = lesson.notes![Number(cell)] ?? [];
          expect([...digits], `${lesson.id} 칸 ${cell}`).toEqual(before.filter((d) => !removed.has(`${cell}:${d}`)));
        }
      }
    }
  });

  it('id가 겹치지 않는다', () => {
    expect(new Set(ALL_LESSONS.map((l) => l.id)).size).toBe(ALL_LESSONS.length);
    expect(BASIC_LESSONS.length + ADVANCED_LESSONS.length).toBe(ALL_LESSONS.length);
  });
});

describe('lessonForHint', () => {
  const technique = (tactic: TacticKey): HintView => ({
    kind: 'technique',
    tactic,
    action: 'eliminate',
    digit: 1,
    focusCell: 0,
    regionCells: [],
    patternCells: [],
    patternDigits: [],
    placements: [],
    eliminations: [],
    candidates: Array(81).fill(0),
  });

  it.each([
    ['openSingles', { tab: 'basic', id: 'openSingle' }],
    ['hiddenSingle', { tab: 'basic', id: 'hiddenSingle' }],
    ['nakedSingle', { tab: 'basic', id: 'nakedSingle' }],
    ['pointing', { tab: 'advanced', id: 'pointing' }],
    ['nakedPair', { tab: 'advanced', id: 'nakedPair' }],
    ['nakedTriple', { tab: 'advanced', id: 'nakedTriple' }],
    ['hiddenPair', { tab: 'advanced', id: 'hiddenPair' }],
    ['xWing', { tab: 'advanced', id: 'xWing' }],
    ['yWing', { tab: 'advanced', id: 'yWing' }],
    ['swordfish', null],
  ] as const)('%s → %o', (tactic, expected) => {
    expect(lessonForHint(technique(tactic))).toEqual(expected);
  });

  it('포인팅 힌트는 방향에 맞는 설명으로 연결한다', () => {
    const base = technique('pointing');
    if (base.kind !== 'technique') throw new Error('technique');
    // 박스 → 줄: 1행의 패턴 칸, 지울 칸도 1행
    const boxToLine: HintView = { ...base, patternCells: [0, 2], eliminations: [{ index: 6, digit: 5 }] };
    // 줄 → 박스: 5행의 패턴 칸, 지울 칸은 같은 박스의 다른 행
    const lineToBox: HintView = { ...base, patternCells: [36, 37], eliminations: [{ index: 27, digit: 3 }] };
    expect(lessonForHint(boxToLine)).toEqual({ tab: 'advanced', id: 'pointing' });
    expect(lessonForHint(lineToBox)).toEqual({ tab: 'advanced', id: 'claiming' });
    // 지울 칸이 줄 밖이면서 박스 밖이기도 하면(예상 밖 데이터) 방향을 판정하지 않고 기본 설명으로 연결한다.
    const mixed: HintView = { ...base, patternCells: [36, 37], eliminations: [{ index: 80, digit: 3 }] };
    expect(lessonForHint(mixed)).toEqual({ tab: 'advanced', id: 'pointing' });
  });

  it('메모 점검은 후보 적기 설명으로, 틀린 숫자는 설명 없음', () => {
    expect(lessonForHint({ kind: 'missingNote', cell: 0, digit: 1 })).toEqual({ tab: 'basic', id: 'candidates' });
    expect(lessonForHint({ kind: 'impossibleNote', cell: 0, digit: 1 })).toEqual({ tab: 'basic', id: 'candidates' });
    expect(lessonForHint({ kind: 'wrongValue', cell: 0, digit: 1 })).toBeNull();
  });

  it('가리키는 설명은 모두 실제로 있다', () => {
    for (const tactic of TACTIC_KEYS) {
      const target = lessonForHint(technique(tactic));
      if (target) expect(ALL_LESSONS.some((l) => l.id === target.id), tactic).toBe(true);
    }
  });
});
