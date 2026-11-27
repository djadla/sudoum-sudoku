import { indexOf } from '../../engine/grid';
import { CELL_COUNT } from '../../engine/types';
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
  /** 칸에 보여 줄 후보 숫자 */
  readonly notes?: Readonly<Record<number, readonly number[]>>;
  /** 이 단계에서 채우는 숫자 */
  readonly place?: { readonly index: number; readonly digit: number };
}

/** 예제가 설명하는 결론. 테스트가 규칙으로 검증한다. */
export type LessonClaim =
  | { readonly kind: 'openSingle'; readonly house: readonly number[]; readonly index: number; readonly digit: number }
  | { readonly kind: 'hiddenSingle'; readonly house: readonly number[]; readonly index: number; readonly digit: number }
  | { readonly kind: 'candidates'; readonly index: number; readonly digits: readonly number[] };

export interface Lesson {
  readonly id: string;
  /** 제목은 힌트의 기법 이름을 그대로 쓴다. (hint.tactic.*) 또는 별도 키 */
  readonly title: PlainMessageKey;
  readonly summary: PlainMessageKey;
  /** 예제 보드 (0은 빈칸) */
  readonly values: readonly number[];
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

/** 고급 풀이 탭: 지금은 한 줄 설명만 보여 준다. (움직이는 설명은 다음 PR) */
export const ADVANCED_TOPICS = [
  { title: 'hint.tactic.pointing', summary: 'lesson.advanced.pointing' },
  { title: 'hint.tactic.nakedPair', summary: 'lesson.advanced.nakedPair' },
  { title: 'hint.tactic.nakedTriple', summary: 'lesson.advanced.nakedTriple' },
  { title: 'hint.tactic.hiddenPair', summary: 'lesson.advanced.hiddenPair' },
  { title: 'hint.tactic.xWing', summary: 'lesson.advanced.xWing' },
  { title: 'hint.tactic.yWing', summary: 'lesson.advanced.yWing' },
] as const satisfies readonly { title: PlainMessageKey; summary: PlainMessageKey }[];
