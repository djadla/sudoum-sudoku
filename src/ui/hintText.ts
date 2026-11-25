import { boxOf, colOf, commonHouse, rowOf } from '../engine/grid';
import type { CellDigit, House, HintView, TacticKey } from '../engine/hintTypes';
import type { Translate } from '../i18n';

// 언어 중립적인 HintView로 현재 언어의 힌트 문장을 만든다. (ADR-0002 4번, ADR-0003 6번)
// sudoku-core의 영어 설명문은 쓰지 않는다.

export interface HintText {
  readonly title: string;
  readonly body: string;
  /** 지울 후보 목록 ("지울 후보: 5행 2열의 7, …"). 없으면 null */
  readonly removals: string | null;
}

const NAKED_GROUPS: readonly TacticKey[] = ['nakedPair', 'nakedTriple', 'nakedQuad'];
const HIDDEN_GROUPS: readonly TacticKey[] = ['hiddenPair', 'hiddenTriple', 'hiddenQuad', 'hiddenGroups'];

const cellName = (t: Translate, index: number) => t('hint.cell', { row: rowOf(index) + 1, col: colOf(index) + 1 });

function houseName(t: Translate, house: House): string {
  const n = house.index + 1;
  if (house.kind === 'row') return t('hint.row', { n });
  if (house.kind === 'column') return t('hint.column', { n });
  return t('hint.box', { n });
}

const list = (items: readonly string[]) => items.join(', ');
const sortedUnique = (values: readonly number[]) => [...new Set(values)].sort((a, b) => a - b);

function removals(t: Translate, eliminations: readonly CellDigit[]): string | null {
  if (eliminations.length === 0) return null;
  const items = eliminations.map(({ index, digit }) => t('hint.removeItem', { cell: cellName(t, index), digit }));
  return t('hint.removeList', { items: list(items) });
}

/** 포인팅: 패턴 칸이 놓인 박스와 줄을 찾고, 지울 칸이 줄 쪽이면 박스→줄, 박스 쪽이면 줄→박스 방향이다. */
function pointingBody(t: Translate, hint: Extract<HintView, { kind: 'technique' }>, digit: number): string | null {
  const pattern = hint.patternCells;
  const line = commonHouse(pattern);
  // 지울 후보가 없으면 every()가 참이 되어 사실과 다른 방향을 고를 수 있으므로 공통 문장으로 보낸다.
  if (pattern.length === 0 || hint.eliminations.length === 0 || !line || line.kind === 'box') return null;
  const box: House = { kind: 'box', index: boxOf(pattern[0]!) };
  if (!pattern.every((cell) => boxOf(cell) === box.index)) return null;
  const inLine = (cell: number) => (line.kind === 'row' ? rowOf(cell) : colOf(cell)) === line.index;
  const params = { box: houseName(t, box), line: houseName(t, line), digit };
  if (hint.eliminations.every(({ index }) => inLine(index))) return t('hint.body.pointingBoxToLine', params);
  if (hint.eliminations.every(({ index }) => boxOf(index) === box.index)) return t('hint.body.pointingLineToBox', params);
  return null;
}

/** X-Wing: 네 칸의 두 행·두 열 중, 지울 칸이 놓인 쪽이 교차선(crosses)이고 반대쪽이 기준선(lines)이다. */
function xWingBody(t: Translate, hint: Extract<HintView, { kind: 'technique' }>, digit: number): string | null {
  const rows = sortedUnique(hint.patternCells.map(rowOf));
  const cols = sortedUnique(hint.patternCells.map(colOf));
  if (rows.length !== 2 || cols.length !== 2 || hint.eliminations.length === 0) return null;
  const elimInCols = hint.eliminations.every(({ index }) => cols.includes(colOf(index)));
  const name = (kind: 'row' | 'column', [a, b]: number[]) =>
    t('hint.pair', { a: houseName(t, { kind, index: a! }), b: houseName(t, { kind, index: b! }) });
  return elimInCols
    ? t('hint.body.xWing', { lines: name('row', rows), crosses: name('column', cols), digit })
    : t('hint.body.xWing', { lines: name('column', cols), crosses: name('row', rows), digit });
}

function techniqueBody(t: Translate, hint: Extract<HintView, { kind: 'technique' }>, tacticName: string): string {
  const placement = hint.placements[0];
  const digit = placement?.digit ?? hint.digit ?? hint.eliminations[0]?.digit ?? 0;
  const cell = placement ? cellName(t, placement.index) : hint.focusCell !== null ? cellName(t, hint.focusCell) : '';
  const regionHouse = commonHouse(hint.regionCells);

  if (hint.action === 'place' && placement) {
    if ((hint.tactic === 'openSingles' || hint.tactic === 'hiddenSingle') && regionHouse) {
      return t(hint.tactic === 'openSingles' ? 'hint.body.openSingles' : 'hint.body.hiddenSingle', {
        house: houseName(t, regionHouse),
        cell,
        digit,
      });
    }
    if (hint.tactic === 'nakedSingle') return t('hint.body.nakedSingle', { cell, digit });
    return t('hint.body.genericPlace', { tactic: tacticName, cell, digit });
  }

  const special =
    hint.tactic === 'pointing'
      ? pointingBody(t, hint, digit)
      : hint.tactic === 'xWing'
        ? xWingBody(t, hint, digit)
        : (NAKED_GROUPS.includes(hint.tactic) || HIDDEN_GROUPS.includes(hint.tactic)) && regionHouse
          ? t(NAKED_GROUPS.includes(hint.tactic) ? 'hint.body.nakedGroup' : 'hint.body.hiddenGroup', {
              house: houseName(t, regionHouse),
              cells: list([...hint.patternCells].sort((a, b) => a - b).map((index) => cellName(t, index))),
              count: hint.patternCells.length,
              digits: list(sortedUnique(hint.patternDigits).map(String)),
            })
          : null;
  return special ?? t('hint.body.genericEliminate', { tactic: tacticName, digit });
}

export function describeHint(t: Translate, hint: HintView): HintText {
  switch (hint.kind) {
    case 'technique': {
      const title = t(`hint.tactic.${hint.tactic}`);
      return { title, body: techniqueBody(t, hint, title), removals: removals(t, hint.eliminations) };
    }
    case 'wrongValue':
    case 'impossibleNote':
    case 'missingNote':
      return {
        title: t(`hint.kind.${hint.kind}`),
        body: t(`hint.body.${hint.kind}`, { cell: cellName(t, hint.cell), digit: hint.digit }),
        removals: null,
      };
  }
}
