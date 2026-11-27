import { indexOf } from '../../engine/grid';
import { CELL_COUNT } from '../../engine/types';
import type { HintView, TacticKey } from '../../engine/hintTypes';
import type { PlainMessageKey } from '../../i18n';

// 플레이 가이드의 "풀이" 탭에서 보여 주는 움직이는 설명 데이터. (2026-11-26 사용자 요청)
// 예제 보드는 직접 만든 것이며, 각 예제가 설명하는 결론이 규칙상 성립하는지는 lessons.test.ts가 검사한다.

/** 1부터 세는 행·열 (설명 문장의 "3행 5열"과 맞추기 위해) */
export const at = (row: number, col: number): number => indexOf(row - 1, col - 1);

/** 애니메이션의 한 단계 */
export interface LessonFrame {
  readonly caption: PlainMessageKey;
  /** 지금 살펴보는 행·열·박스 (옅게 강조) */
  readonly region?: readonly number[];
  /** 숫자가 들어갈 수 없다고 지운 칸 (빗금) */
  readonly shade?: readonly number[];
  /** 근거가 되는 숫자가 있는 칸 (초록 테두리) */
  readonly pattern?: readonly number[];
  /** 답을 찾는 칸 (노란 테두리) */
  readonly focus?: number;
  /** 칸에 보여 줄 후보 숫자 (예제의 기본 후보 lesson.notes를 칸 단위로 덮어쓴다) */
  readonly notes?: Readonly<Record<number, readonly number[]>>;
  /** 이 단계에서 채우는 숫자 */
  readonly place?: { readonly index: number; readonly digit: number };
  /** 근거가 되는 후보 (초록 밑줄) */
  readonly mark?: readonly CellDigit[];
  /** 지울 후보 (빨간 취소선) */
  readonly strike?: readonly CellDigit[];
}

export interface CellDigit {
  readonly index: number;
  readonly digit: number;
}

/** 예제가 설명하는 결론. 테스트가 규칙으로 검증한다. */
export type LessonClaim =
  | { readonly kind: 'openSingle'; readonly house: readonly number[]; readonly index: number; readonly digit: number }
  | { readonly kind: 'hiddenSingle'; readonly house: readonly number[]; readonly index: number; readonly digit: number }
  | { readonly kind: 'candidates'; readonly index: number; readonly digits: readonly number[] }
  /** 포인팅: 박스 안에서 digit의 후보가 모두 line 위에 있으면, line의 박스 밖 칸에서 digit을 지운다. */
  | {
      readonly kind: 'pointing';
      readonly box: readonly number[];
      readonly line: readonly number[];
      readonly digit: number;
      readonly eliminations: readonly CellDigit[];
    }
  /** 드러난 쌍·세 쌍: unit 안의 cells 후보를 합친 숫자 수가 칸 수와 같으면, unit의 다른 칸에서 그 숫자들을 지운다. */
  | {
      readonly kind: 'nakedSubset';
      readonly unit: readonly number[];
      readonly cells: readonly number[];
      readonly eliminations: readonly CellDigit[];
    }
  /** 숨은 쌍: digits가 unit 안에서 cells에만 있으면, cells의 다른 후보를 지운다. */
  | {
      readonly kind: 'hiddenSubset';
      readonly unit: readonly number[];
      readonly cells: readonly number[];
      readonly digits: readonly number[];
      readonly eliminations: readonly CellDigit[];
    }
  /** X-Wing: 두 base 줄에서 digit의 후보가 같은 두 cover 줄에만 있으면, cover 줄의 다른 칸에서 digit을 지운다. */
  | {
      readonly kind: 'xWing';
      readonly digit: number;
      readonly bases: readonly (readonly number[])[];
      readonly covers: readonly (readonly number[])[];
      readonly eliminations: readonly CellDigit[];
    }
  /** Y-Wing: pivot {x,y}가 날개 {x,z}·{y,z}를 보면, 두 날개를 모두 보는 칸에서 z를 지운다. */
  | {
      readonly kind: 'yWing';
      readonly pivot: number;
      readonly wings: readonly [number, number];
      readonly digit: number;
      readonly eliminations: readonly CellDigit[];
    };

export interface Lesson {
  readonly id: string;
  /** 제목은 힌트의 기법 이름을 그대로 쓴다. (hint.tactic.*) 또는 별도 키 */
  readonly title: PlainMessageKey;
  readonly summary: PlainMessageKey;
  /** 예제 보드 (0은 빈칸) */
  readonly values: readonly number[];
  /** 예제의 기본 후보 (고급 풀이: 후보가 이렇게 남아 있을 때를 가정한다) */
  readonly notes?: Readonly<Record<number, readonly number[]>>;
  readonly frames: readonly LessonFrame[];
  readonly claim: LessonClaim;
}

function board(entries: readonly (readonly [row: number, col: number, digit: number])[]): number[] {
  const values = Array<number>(CELL_COUNT).fill(0);
  for (const [row, col, digit] of entries) values[at(row, col)] = digit;
  return values;
}

const row = (r: number) => Array.from({ length: 9 }, (_, c) => at(r, c + 1));
const col = (c: number) => Array.from({ length: 9 }, (_, r) => at(r + 1, c));
/** 박스 번호 1~9 (왼쪽 위부터 가로로) */
const box = (b: number) => {
  const r0 = Math.floor((b - 1) / 3) * 3 + 1;
  const c0 = ((b - 1) % 3) * 3 + 1;
  return Array.from({ length: 9 }, (_, i) => at(r0 + Math.floor(i / 3), c0 + (i % 3)));
};
const inBox = (b: number, cells: readonly number[]) => cells.filter((cell) => box(b).includes(cell));

// 1. 마지막 빈칸: 1행에 빈칸이 하나뿐이고 7만 빠져 있다.
const openSingle: Lesson = {
  id: 'openSingle',
  title: 'hint.tactic.openSingles',
  summary: 'lesson.openSingle.summary',
  values: board([
    [1, 1, 5], [1, 2, 3], [1, 3, 4], [1, 4, 6], [1, 6, 8], [1, 7, 9], [1, 8, 1], [1, 9, 2],
    [4, 2, 7], [6, 8, 3], [8, 4, 2],
  ]),
  frames: [
    { caption: 'lesson.openSingle.s1', region: row(1), focus: at(1, 5) },
    { caption: 'lesson.openSingle.s2', region: row(1), pattern: row(1).filter((i) => i !== at(1, 5)), focus: at(1, 5) },
    { caption: 'lesson.openSingle.s3', region: row(1), focus: at(1, 5), place: { index: at(1, 5), digit: 7 } },
  ],
  claim: { kind: 'openSingle', house: row(1), index: at(1, 5), digit: 7 },
};

// 2. 숨은 싱글: 1번 박스에서 숫자 1의 자리를 찾는다.
//    2·3행과 2·3열에 이미 1이 있어, 박스에서 1이 들어갈 칸은 1행 1열 하나뿐이다.
const ONES = [at(2, 6), at(3, 8), at(6, 2), at(8, 3)];
const hiddenSingle: Lesson = {
  id: 'hiddenSingle',
  title: 'hint.tactic.hiddenSingle',
  summary: 'lesson.hiddenSingle.summary',
  values: board([
    [2, 6, 1], [3, 8, 1], [6, 2, 1], [8, 3, 1],
    [2, 1, 4], [3, 2, 7], [1, 5, 3], [5, 5, 6], [9, 9, 5],
  ]),
  frames: [
    { caption: 'lesson.hiddenSingle.s1', region: box(1), pattern: ONES },
    { caption: 'lesson.hiddenSingle.s2', region: box(1), pattern: [at(2, 6), at(3, 8)], shade: [...row(2), ...row(3)] },
    {
      caption: 'lesson.hiddenSingle.s3',
      region: box(1),
      pattern: ONES,
      shade: [...row(2), ...row(3), ...col(2), ...col(3)],
    },
    {
      caption: 'lesson.hiddenSingle.s4',
      region: box(1),
      shade: inBox(1, [...row(2), ...row(3), ...col(2), ...col(3)]),
      focus: at(1, 1),
      place: { index: at(1, 1), digit: 1 },
    },
  ],
  claim: { kind: 'hiddenSingle', house: box(1), index: at(1, 1), digit: 1 },
};

// 3. 후보 적기: 5행 5열에 들어갈 수 있는 숫자를 행·열·박스 순서로 지워 4, 7을 남긴다.
const TARGET = at(5, 5);
const candidateValues: readonly (readonly [number, number, number])[] = [
  [5, 1, 5], [5, 3, 9], [5, 8, 6], // 5행
  [1, 5, 8], [8, 5, 2], // 5열
  [4, 4, 3], [6, 6, 1], // 5번 박스
];
const candidates: Lesson = {
  id: 'candidates',
  title: 'lesson.candidates.title',
  summary: 'lesson.candidates.summary',
  values: board(candidateValues),
  frames: [
    { caption: 'lesson.candidates.s1', region: row(5), pattern: [at(5, 1), at(5, 3), at(5, 8)], focus: TARGET },
    { caption: 'lesson.candidates.s2', region: col(5), pattern: [at(1, 5), at(8, 5)], focus: TARGET },
    { caption: 'lesson.candidates.s3', region: box(5), pattern: [at(4, 4), at(6, 6)], focus: TARGET },
    { caption: 'lesson.candidates.s4', focus: TARGET, notes: { [TARGET]: [4, 7] } },
  ],
  claim: { kind: 'candidates', index: TARGET, digits: [4, 7] },
};

// 4. 단일 후보: 위 예제에 5행 9열의 4를 더하면 5행 5열의 후보는 7 하나만 남는다.
const nakedSingle: Lesson = {
  id: 'nakedSingle',
  title: 'hint.tactic.nakedSingle',
  summary: 'lesson.nakedSingle.summary',
  values: board([...candidateValues, [5, 9, 4]]),
  frames: [
    {
      caption: 'lesson.nakedSingle.s1',
      region: [...row(5), ...col(5), ...box(5)],
      pattern: [at(5, 1), at(5, 3), at(5, 8), at(5, 9), at(1, 5), at(8, 5), at(4, 4), at(6, 6)],
      focus: TARGET,
    },
    { caption: 'lesson.nakedSingle.s2', region: [...row(5), ...col(5), ...box(5)], focus: TARGET, notes: { [TARGET]: [7] } },
    { caption: 'lesson.nakedSingle.s3', focus: TARGET, place: { index: TARGET, digit: 7 } },
  ],
  claim: { kind: 'candidates', index: TARGET, digits: [7] },
};

/** 기본 풀이 탭의 순서 (쉬운 것부터) */
export const BASIC_LESSONS: readonly Lesson[] = [openSingle, hiddenSingle, candidates, nakedSingle];

// ───────── 고급 풀이 ─────────
// 고급 기법은 후보를 지우는 기법이라, 예제마다 "후보가 이렇게 남아 있을 때"를 가정하고 후보(notes)를 함께 보여 준다.
// 테스트는 (1) 후보가 보드의 숫자와 모순되지 않는지, (2) 기법이 보는 단위의 빈칸이 모두 후보를 보여 주는지,
// (3) 기법의 조건과 지우는 후보가 규칙상 맞는지를 검사한다. (lessons.test.ts)

type NoteEntry = readonly [row: number, col: number, digits: readonly number[]];
const notesOf = (entries: readonly NoteEntry[]): Record<number, readonly number[]> =>
  Object.fromEntries(entries.map(([r, c, digits]) => [at(r, c), digits]));
const cd = (row: number, col: number, digit: number): CellDigit => ({ index: at(row, col), digit });
/** 지운 뒤의 후보 */
function afterStrike(notes: Readonly<Record<number, readonly number[]>>, strike: readonly CellDigit[]) {
  const next: Record<number, readonly number[]> = {};
  for (const { index, digit } of strike) next[index] = (next[index] ?? notes[index] ?? []).filter((d) => d !== digit);
  return next;
}
const marksOf = (notes: Readonly<Record<number, readonly number[]>>, digits: readonly number[], cells?: readonly number[]) =>
  Object.entries(notes).flatMap(([cell, list]) =>
    cells && !cells.includes(Number(cell)) ? [] : list.filter((d) => digits.includes(d)).map((digit) => ({ index: Number(cell), digit })),
  );

// 5. 포인팅: 1번 박스에서 5의 후보는 2행에만 있다 → 2행의 박스 밖 칸에서 5를 지운다.
const pointingNotes = notesOf([
  [1, 1, [1, 2]], [1, 3, [1, 4]],
  [2, 1, [5, 6]], [2, 3, [4, 5]],
  [3, 1, [2, 6]], [3, 2, [1, 7]],
  [2, 4, [1, 5]], [2, 5, [2, 6]], [2, 6, [5, 7]], [2, 7, [3, 4]], [2, 8, [5, 8]], [2, 9, [6, 7]],
]);
const pointingStrike = [cd(2, 4, 5), cd(2, 6, 5), cd(2, 8, 5)];
const pointing: Lesson = {
  id: 'pointing',
  title: 'hint.tactic.pointing',
  summary: 'lesson.advanced.pointing',
  values: board([[1, 2, 3], [2, 2, 9], [3, 3, 8]]),
  notes: pointingNotes,
  frames: [
    { caption: 'lesson.pointing.s1', region: box(1), mark: marksOf(pointingNotes, [5], box(1)) },
    { caption: 'lesson.pointing.s2', region: [...box(1), ...row(2)], pattern: [at(2, 1), at(2, 3)], mark: marksOf(pointingNotes, [5], box(1)) },
    { caption: 'lesson.pointing.s3', region: row(2), pattern: [at(2, 1), at(2, 3)], strike: pointingStrike },
    { caption: 'lesson.pointing.s4', region: row(2), notes: afterStrike(pointingNotes, pointingStrike) },
  ],
  claim: { kind: 'pointing', box: box(1), line: row(2), digit: 5, eliminations: pointingStrike },
};

// 6. 드러난 쌍: 1행 2열과 1행 5열의 후보가 모두 {3, 8} → 1행의 다른 칸에서 3, 8을 지운다.
const pairNotes = notesOf([
  [1, 1, [1, 4, 6]], [1, 2, [3, 8]], [1, 4, [1, 3, 8]], [1, 5, [3, 8]],
  [1, 6, [4, 6, 9]], [1, 8, [1, 4, 9]], [1, 9, [3, 5, 6]],
]);
const pairStrike = [cd(1, 4, 3), cd(1, 4, 8), cd(1, 9, 3)];
const nakedPair: Lesson = {
  id: 'nakedPair',
  title: 'hint.tactic.nakedPair',
  summary: 'lesson.advanced.nakedPair',
  values: board([[1, 3, 7], [1, 7, 2]]),
  notes: pairNotes,
  frames: [
    { caption: 'lesson.nakedPair.s1', region: row(1), pattern: [at(1, 2), at(1, 5)], mark: marksOf(pairNotes, [3, 8], [at(1, 2), at(1, 5)]) },
    { caption: 'lesson.nakedPair.s2', region: row(1), pattern: [at(1, 2), at(1, 5)], strike: pairStrike },
    { caption: 'lesson.nakedPair.s3', region: row(1), focus: at(1, 4), notes: afterStrike(pairNotes, pairStrike) },
  ],
  claim: { kind: 'nakedSubset', unit: row(1), cells: [at(1, 2), at(1, 5)], eliminations: pairStrike },
};

// 7. 드러난 세 쌍: 9열의 1·3·4행 칸 후보를 합치면 {2, 5, 7} → 9열의 다른 칸에서 2, 5, 7을 지운다.
const TRIPLE = [at(1, 9), at(3, 9), at(4, 9)];
const tripleNotes = notesOf([
  [1, 9, [2, 5]], [3, 9, [5, 7]], [4, 9, [2, 7]],
  [6, 9, [2, 3, 6]], [7, 9, [3, 5, 8]], [9, 9, [6, 7, 8]],
]);
const tripleStrike = [cd(6, 9, 2), cd(7, 9, 5), cd(9, 9, 7)];
const nakedTriple: Lesson = {
  id: 'nakedTriple',
  title: 'hint.tactic.nakedTriple',
  summary: 'lesson.advanced.nakedTriple',
  values: board([[2, 9, 4], [5, 9, 9], [8, 9, 1]]),
  notes: tripleNotes,
  frames: [
    { caption: 'lesson.nakedTriple.s1', region: col(9), pattern: TRIPLE, mark: marksOf(tripleNotes, [2, 5, 7], TRIPLE) },
    { caption: 'lesson.nakedTriple.s2', region: col(9), pattern: TRIPLE, strike: tripleStrike },
    { caption: 'lesson.nakedTriple.s3', region: col(9), notes: afterStrike(tripleNotes, tripleStrike) },
  ],
  claim: { kind: 'nakedSubset', unit: col(9), cells: TRIPLE, eliminations: tripleStrike },
};

// 8. 숨은 쌍: 9행에서 1과 6은 9행 2열과 9행 7열에만 있다 → 두 칸의 다른 후보를 지운다.
const HIDDEN = [at(9, 2), at(9, 7)];
const hiddenNotes = notesOf([
  [9, 1, [2, 4, 5]], [9, 2, [1, 2, 6, 8]], [9, 3, [4, 5, 9]], [9, 4, [2, 7, 9]],
  [9, 6, [4, 7, 8]], [9, 7, [1, 5, 6, 9]], [9, 8, [2, 5, 8]], [9, 9, [4, 7, 9]],
]);
const hiddenStrike = [cd(9, 2, 2), cd(9, 2, 8), cd(9, 7, 5), cd(9, 7, 9)];
const hiddenPair: Lesson = {
  id: 'hiddenPair',
  title: 'hint.tactic.hiddenPair',
  summary: 'lesson.advanced.hiddenPair',
  values: board([[9, 5, 3]]),
  notes: hiddenNotes,
  frames: [
    { caption: 'lesson.hiddenPair.s1', region: row(9), mark: marksOf(hiddenNotes, [1, 6]) },
    { caption: 'lesson.hiddenPair.s2', region: row(9), pattern: HIDDEN, mark: marksOf(hiddenNotes, [1, 6]) },
    { caption: 'lesson.hiddenPair.s3', region: row(9), pattern: HIDDEN, strike: hiddenStrike },
    { caption: 'lesson.hiddenPair.s4', region: row(9), pattern: HIDDEN, notes: afterStrike(hiddenNotes, hiddenStrike) },
  ],
  claim: { kind: 'hiddenSubset', unit: row(9), cells: HIDDEN, digits: [1, 6], eliminations: hiddenStrike },
};

// 9. X-Wing: 2행과 7행에서 4는 3열과 8열에만 있다 → 3열과 8열의 다른 칸에서 4를 지운다.
const WING = [at(2, 3), at(2, 8), at(7, 3), at(7, 8)];
const xWingNotes = notesOf([
  [2, 1, [1, 6]], [2, 2, [2, 9]], [2, 3, [4, 6]], [2, 4, [1, 5]], [2, 5, [2, 7]],
  [2, 6, [5, 9]], [2, 7, [6, 7]], [2, 8, [4, 9]], [2, 9, [1, 2]],
  [7, 1, [3, 5]], [7, 2, [1, 3]], [7, 3, [4, 5]], [7, 4, [6, 8]], [7, 5, [1, 9]],
  [7, 6, [3, 8]], [7, 7, [5, 9]], [7, 8, [4, 6]], [7, 9, [1, 8]],
  [4, 3, [4, 7]], [5, 8, [2, 4, 5]], [9, 3, [1, 4]],
]);
const xWingStrike = [cd(4, 3, 4), cd(5, 8, 4), cd(9, 3, 4)];
const xWing: Lesson = {
  id: 'xWing',
  title: 'hint.tactic.xWing',
  summary: 'lesson.advanced.xWing',
  values: board([]),
  notes: xWingNotes,
  frames: [
    { caption: 'lesson.xWing.s1', region: [...row(2), ...row(7)], mark: marksOf(xWingNotes, [4], [...row(2), ...row(7)]) },
    { caption: 'lesson.xWing.s2', region: [...row(2), ...row(7)], pattern: WING, mark: marksOf(xWingNotes, [4], WING) },
    { caption: 'lesson.xWing.s3', region: [...col(3), ...col(8)], pattern: WING, mark: marksOf(xWingNotes, [4], WING) },
    { caption: 'lesson.xWing.s4', region: [...col(3), ...col(8)], pattern: WING, strike: xWingStrike },
  ],
  claim: { kind: 'xWing', digit: 4, bases: [row(2), row(7)], covers: [col(3), col(8)], eliminations: xWingStrike },
};

// 10. Y-Wing: 5행 5열 {1,2}가 5행 2열 {1,3}과 2행 5열 {2,3}을 본다 → 두 날개를 모두 보는 2행 2열에서 3을 지운다.
const PIVOT = at(5, 5);
const WINGS = [at(5, 2), at(2, 5)] as const;
const yWingNotes = notesOf([[5, 5, [1, 2]], [5, 2, [1, 3]], [2, 5, [2, 3]], [2, 2, [3, 6]]]);
const yWingStrike = [cd(2, 2, 3)];
const yWing: Lesson = {
  id: 'yWing',
  title: 'hint.tactic.yWing',
  summary: 'lesson.advanced.yWing',
  values: board([]),
  notes: yWingNotes,
  frames: [
    { caption: 'lesson.yWing.s1', focus: PIVOT, mark: marksOf(yWingNotes, [1, 2], [PIVOT]) },
    { caption: 'lesson.yWing.s2', focus: PIVOT, pattern: [...WINGS], region: [...row(5), ...col(5)] },
    { caption: 'lesson.yWing.s3', focus: PIVOT, pattern: [...WINGS], mark: marksOf(yWingNotes, [3], [...WINGS]) },
    { caption: 'lesson.yWing.s4', pattern: [...WINGS], region: [...row(2), ...col(2)], strike: yWingStrike },
  ],
  claim: { kind: 'yWing', pivot: PIVOT, wings: WINGS, digit: 3, eliminations: yWingStrike },
};

/** 고급 풀이 탭의 순서 */
export const ADVANCED_LESSONS: readonly Lesson[] = [pointing, nakedPair, nakedTriple, hiddenPair, xWing, yWing];

/** 모든 설명. 힌트의 "이 기법 배우기"가 id로 찾는다. */
export const ALL_LESSONS: readonly Lesson[] = [...BASIC_LESSONS, ...ADVANCED_LESSONS];

/** 도움말을 특정 탭·설명으로 열 때의 대상 */
export interface LessonTarget {
  readonly tab: 'basic' | 'advanced';
  readonly id: string;
}

const LESSON_BY_TACTIC: Partial<Record<TacticKey, string>> = {
  openSingles: 'openSingle',
  hiddenSingle: 'hiddenSingle',
  nakedSingle: 'nakedSingle',
  pointing: 'pointing',
  nakedPair: 'nakedPair',
  nakedTriple: 'nakedTriple',
  hiddenPair: 'hiddenPair',
  xWing: 'xWing',
  yWing: 'yWing',
};

/**
 * 힌트에 맞는 설명. 힌트의 "이 기법 배우기"가 쓴다. 설명이 없는 기법·틀린 숫자는 null.
 * 메모 점검(틀린·빠진 메모)은 "후보 적기" 설명으로 안내한다.
 */
export function lessonForHint(hint: HintView): LessonTarget | null {
  const id =
    hint.kind === 'technique'
      ? LESSON_BY_TACTIC[hint.tactic]
      : hint.kind === 'impossibleNote' || hint.kind === 'missingNote'
        ? 'candidates'
        : undefined;
  if (!id) return null;
  return { tab: BASIC_LESSONS.some((l) => l.id === id) ? 'basic' : 'advanced', id };
}
