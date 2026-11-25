import { STRATEGY, TEACH_STRATEGY, teachHint, type TeachingHint } from 'sudoku-core';
import type { HintView, TacticKey } from './hintTypes';

export { commonHouse } from './grid';

// Worker에서만 쓰는 힌트 계산. (sudoku-core 필요, AGENTS.md 의존 규칙)

const TACTIC_BY_STRATEGY: Record<string, TacticKey> = {
  [STRATEGY.OPEN_SINGLES]: 'openSingles',
  [STRATEGY.NAKED_SINGLE]: 'nakedSingle',
  [STRATEGY.HIDDEN_SINGLE]: 'hiddenSingle',
  [STRATEGY.POINTING_ELIMINATION]: 'pointing',
  [STRATEGY.NAKED_PAIR]: 'nakedPair',
  [STRATEGY.NAKED_TRIPLE]: 'nakedTriple',
  [STRATEGY.NAKED_QUAD]: 'nakedQuad',
  [STRATEGY.HIDDEN_PAIR]: 'hiddenPair',
  [STRATEGY.HIDDEN_TRIPLE]: 'hiddenTriple',
  [STRATEGY.HIDDEN_QUAD]: 'hiddenQuad',
  [STRATEGY.HIDDEN_GROUPS]: 'hiddenGroups',
  [STRATEGY.X_WING]: 'xWing',
  [STRATEGY.SWORDFISH]: 'swordfish',
  [STRATEGY.JELLYFISH]: 'jellyfish',
  [STRATEGY.FINNED_X_WING]: 'finnedXWing',
  [STRATEGY.FINNED_SWORDFISH]: 'finnedSwordfish',
  [STRATEGY.FINNED_JELLYFISH]: 'finnedJellyfish',
  [STRATEGY.SKYSCRAPER]: 'skyscraper',
  [STRATEGY.TWO_STRING_KITE]: 'twoStringKite',
  [STRATEGY.CRANE]: 'crane',
  [STRATEGY.EMPTY_RECTANGLE]: 'emptyRectangle',
  [STRATEGY.Y_WING]: 'yWing',
  [STRATEGY.W_WING]: 'wWing',
  [STRATEGY.XYZ_WING]: 'xyzWing',
  [STRATEGY.WXYZ_WING]: 'wxyzWing',
  [STRATEGY.SIMPLE_COLOURING]: 'simpleColouring',
  [STRATEGY.MEDUSA_3D]: 'medusa3d',
  [STRATEGY.X_CHAIN]: 'xChain',
  [STRATEGY.XY_CHAIN]: 'xyChain',
  [STRATEGY.AIC]: 'aic',
  [STRATEGY.NISHIO]: 'nishio',
  [STRATEGY.UNIQUE_RECTANGLE]: 'uniqueRectangle',
  [STRATEGY.BUG_PLUS_ONE]: 'bugPlusOne',
};

/** 매핑에 없는 기법이 오면(라이브러리 업데이트 등) 공통 문장으로 설명할 수 있도록 테스트가 먼저 잡는다. */
export function tacticOf(strategy: string): TacticKey | null {
  return TACTIC_BY_STRATEGY[strategy] ?? null;
}

const toMask = (digits: readonly number[]) => digits.reduce((mask, digit) => mask | (1 << digit), 0);

function maskDigits(mask: number): number[] {
  const digits: number[] = [];
  for (let digit = 1; digit <= 9; digit++) if (mask & (1 << digit)) digits.push(digit);
  return digits;
}

function toView(tip: TeachingHint): HintView | null {
  if (tip.strategy === TEACH_STRATEGY.IMPOSSIBLE_CANDIDATE || tip.strategy === TEACH_STRATEGY.MISSING_CANDIDATE) {
    const update = tip.step.updates[0];
    const digit = update?.eliminatedCandidate ?? update?.addedCandidate ?? tip.digit;
    if (!update || digit == null) return null;
    return {
      kind: tip.strategy === TEACH_STRATEGY.IMPOSSIBLE_CANDIDATE ? 'impossibleNote' : 'missingNote',
      cell: update.index,
      digit,
    };
  }

  const tactic = tacticOf(tip.strategy);
  if (!tactic) return null;
  const placements = tip.step.updates.flatMap((u) => (u.filledValue ? [{ index: u.index, digit: u.filledValue }] : []));
  const eliminations = tip.step.updates.flatMap((u) =>
    u.eliminatedCandidate ? [{ index: u.index, digit: u.eliminatedCandidate }] : [],
  );
  if (placements.length === 0 && eliminations.length === 0) return null;

  return {
    kind: 'technique',
    tactic,
    action: placements.length > 0 ? 'place' : 'eliminate',
    digit: tip.digit,
    focusCell: tip.focusCell,
    regionCells: tip.regionCells,
    patternCells: [...new Set([...tip.digitCells, ...tip.relatedCells])],
    patternDigits: tip.patternDigits,
    placements,
    eliminations,
    candidates: tip.previewCandidates.map(toMask),
  };
}

/**
 * 현재 보드와 사용자 메모로 다음 힌트를 계산한다. 적용할 힌트가 없으면 null.
 * values: 0은 빈칸. notes: 칸별 메모 비트 마스크(0이면 메모 없음 → sudoku-core가 가능한 후보 전체로 본다).
 */
export function computeHint(values: readonly number[], notes: readonly number[]): HintView | null {
  const board = values.map((value) => (value === 0 ? null : value));
  const noteLists = notes.map((mask, index) => (values[index] === 0 ? maskDigits(mask) : []));
  const tip = teachHint(board, noteLists);
  return tip ? toView(tip) : null;
}
