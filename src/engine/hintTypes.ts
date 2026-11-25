// 힌트를 언어 중립적으로 나타내는 타입. (ADR-0002 4번, ADR-0003)
// sudoku-core를 불러오지 않으므로 메인 번들(ui·game)에서 써도 된다.

/** 기법 키. sudoku-core의 STRATEGY 값과 1:1로 대응한다. (engine/hint.ts) */
export const TACTIC_KEYS = [
  'openSingles',
  'nakedSingle',
  'hiddenSingle',
  'pointing',
  'nakedPair',
  'nakedTriple',
  'nakedQuad',
  'hiddenPair',
  'hiddenTriple',
  'hiddenQuad',
  'hiddenGroups',
  'xWing',
  'swordfish',
  'jellyfish',
  'finnedXWing',
  'finnedSwordfish',
  'finnedJellyfish',
  'skyscraper',
  'twoStringKite',
  'crane',
  'emptyRectangle',
  'yWing',
  'wWing',
  'xyzWing',
  'wxyzWing',
  'simpleColouring',
  'medusa3d',
  'xChain',
  'xyChain',
  'aic',
  'nishio',
  'uniqueRectangle',
  'bugPlusOne',
] as const;

export type TacticKey = (typeof TACTIC_KEYS)[number];

export type HouseKind = 'row' | 'column' | 'box';

/** 행·열·박스 하나. index는 0부터 (화면에는 +1 해서 보여 준다) */
export interface House {
  readonly kind: HouseKind;
  readonly index: number;
}

export interface CellDigit {
  readonly index: number;
  readonly digit: number;
}

export type HintView =
  | {
      /** 풀이 기법으로 찾은 다음 수 */
      readonly kind: 'technique';
      readonly tactic: TacticKey;
      readonly action: 'place' | 'eliminate';
      /** 대표 숫자 (배치할 숫자, 또는 지울 후보 중 첫 숫자) */
      readonly digit: number | null;
      readonly focusCell: number | null;
      /** 근거가 되는 행·열·박스 칸 (테두리 강조) */
      readonly regionCells: readonly number[];
      /** 패턴을 이루는 칸 (초록 강조) */
      readonly patternCells: readonly number[];
      /** 패턴을 이루는 숫자 (예: 쌍의 두 숫자) */
      readonly patternDigits: readonly number[];
      readonly placements: readonly CellDigit[];
      readonly eliminations: readonly CellDigit[];
      /** 힌트를 계산할 때 본 후보(칸별 비트 마스크). 메모를 안 쓴 칸의 후보를 보여 주고 적용하는 데 쓴다. */
      readonly candidates: readonly number[];
    }
  | {
      /** 사용자 메모 중 들어갈 수 없는 후보 */
      readonly kind: 'impossibleNote';
      readonly cell: number;
      readonly digit: number;
    }
  | {
      /** 사용자 메모에 빠진 후보 */
      readonly kind: 'missingNote';
      readonly cell: number;
      readonly digit: number;
    }
  | {
      /** 정답과 다른 숫자 (메인 스레드에서 정답과 비교해 찾는다) */
      readonly kind: 'wrongValue';
      readonly cell: number;
      readonly digit: number;
    };
