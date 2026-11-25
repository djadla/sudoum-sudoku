import { useEffect, useMemo, useRef } from 'react';
import { colOf, findConflicts, isPeer, rowOf } from '../engine/grid';
import type { HintView } from '../engine/hintTypes';
import { hasNote, isGiven, noteBit, noteDigits, type GameState } from '../game/state';
import { useI18n } from '../i18n/I18nProvider';

interface BoardProps {
  readonly state: GameState;
  readonly onSelect: (index: number) => void;
  /** 보여 주고 있는 힌트. 있으면 대상 칸·근거 칸·지울 후보를 강조한다. */
  readonly hint?: HintView | null;
}

const ROWS = Array.from({ length: 9 }, (_, row) => row);
const COLS = Array.from({ length: 9 }, (_, col) => col);
const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/** 힌트를 칸 단위 강조 정보로 바꾼다. */
interface HintMarks {
  readonly focus: number | null;
  readonly region: ReadonlySet<number>;
  readonly pattern: ReadonlySet<number>;
  readonly patternDigits: ReadonlySet<number>;
  /** 칸 → 지울 후보 */
  readonly eliminate: ReadonlyMap<number, ReadonlySet<number>>;
  /** 칸 → 더할 후보 (빠진 메모) */
  readonly add: ReadonlyMap<number, number>;
  /** 메모를 쓰지 않은 칸에 흐리게 보여 줄 후보 (힌트가 본 후보) */
  readonly preview: ReadonlyMap<number, number>;
  readonly wrong: number | null;
}

const NO_MARKS: HintMarks = {
  focus: null,
  region: new Set(),
  pattern: new Set(),
  patternDigits: new Set(),
  eliminate: new Map(),
  add: new Map(),
  preview: new Map(),
  wrong: null,
};

function toMarks(hint: HintView | null | undefined, values: readonly number[], notes: readonly number[]): HintMarks {
  if (!hint) return NO_MARKS;
  switch (hint.kind) {
    case 'wrongValue':
      return { ...NO_MARKS, focus: hint.cell, wrong: hint.cell };
    case 'impossibleNote':
      return { ...NO_MARKS, focus: hint.cell, eliminate: new Map([[hint.cell, new Set([hint.digit])]]) };
    case 'missingNote':
      return { ...NO_MARKS, focus: hint.cell, add: new Map([[hint.cell, hint.digit]]) };
    case 'technique': {
      const eliminate = new Map<number, Set<number>>();
      for (const { index, digit } of hint.eliminations) {
        eliminate.set(index, (eliminate.get(index) ?? new Set()).add(digit));
      }
      // 설명이 가리키는 후보가 보이도록, 관련 칸 중 메모가 없는 빈칸에는 힌트가 본 후보를 흐리게 보여 준다.
      const preview = new Map<number, number>();
      for (const index of [...hint.patternCells, ...eliminate.keys(), ...(hint.focusCell !== null ? [hint.focusCell] : [])]) {
        if (values[index] === 0 && notes[index] === 0 && hint.candidates[index]) preview.set(index, hint.candidates[index]!);
      }
      return {
        ...NO_MARKS,
        focus: hint.focusCell ?? hint.placements[0]?.index ?? null,
        region: new Set(hint.regionCells),
        pattern: new Set(hint.patternCells),
        patternDigits: new Set(hint.patternDigits),
        eliminate,
        preview,
      };
    }
  }
}

export function Board({ state, onSelect, hint }: BoardProps) {
  const { t } = useI18n();
  const boardRef = useRef<HTMLDivElement>(null);
  const { selected, values, notes } = state;
  const selectedValue = selected === null ? 0 : values[selected]!;
  // 같은 행·열·박스에 같은 숫자가 겹친 칸 (주어진 숫자도 포함해 양쪽 모두 표시한다)
  const conflicts = useMemo(() => findConflicts(values), [values]);
  const marks = useMemo(() => toMarks(hint, values, notes), [hint, values, notes]);

  // 키보드로 선택을 옮겼을 때, 포커스가 보드 안에 있으면 포커스도 따라가게 한다.
  // (숫자 패드 버튼 등 보드 밖의 포커스는 빼앗지 않는다)
  useEffect(() => {
    const board = boardRef.current;
    if (selected === null || !board?.contains(document.activeElement)) return;
    board.querySelector<HTMLElement>(`[data-index="${selected}"]`)?.focus();
  }, [selected]);

  function cellLabel(index: number): string {
    const position = { row: rowOf(index) + 1, col: colOf(index) + 1 };
    const value = values[index]!;
    let label: string;
    if (isGiven(state, index)) label = t('board.cellGiven', { ...position, value });
    else if (value !== 0) label = t('board.cellFilled', { ...position, value });
    else {
      const digits = noteDigits(notes[index]!);
      label = digits.length > 0 ? t('board.cellNotes', { ...position, notes: digits.join(', ') }) : t('board.cellEmpty', position);
    }
    if (value !== 0 && conflicts[index]) label = t('board.withDuplicate', { label });
    if (marks.focus === index) label = t('board.withHint', { label });
    return label;
  }

  return (
    <div
      ref={boardRef}
      className="board"
      role="grid"
      aria-label={t('board.label')}
      data-hinting={hint ? true : undefined}
    >
      {ROWS.map((row) => (
        <div key={row} role="row" className="board-row">
          {COLS.map((col) => {
            const index = row * 9 + col;
            const value = values[index]!;
            const isSelected = selected === index;
            // 선택이 없으면 첫 칸이 Tab으로 들어오는 진입점이 된다. (roving tabindex)
            const tabbable = selected === null ? index === 0 : isSelected;
            const classes = ['cell'];
            if (col % 3 === 2 && col < 8) classes.push('box-right');
            if (row % 3 === 2 && row < 8) classes.push('box-bottom');

            const preview = marks.preview.get(index);
            const added = marks.add.get(index);
            const noteMask = (notes[index] || preview || 0) | (added ? noteBit(added) : 0);
            const eliminated = marks.eliminate.get(index);
            const inPattern = marks.pattern.has(index);

            return (
              <div
                key={col}
                role="gridcell"
                className={classes.join(' ')}
                data-index={index}
                data-given={isGiven(state, index) || undefined}
                data-selected={isSelected || undefined}
                data-peer={(selected !== null && isPeer(selected, index)) || undefined}
                data-same={(selectedValue !== 0 && value === selectedValue && !isSelected) || undefined}
                data-conflict={(value !== 0 && conflicts[index]) || undefined}
                data-hint-focus={marks.focus === index || undefined}
                data-hint-region={marks.region.has(index) || undefined}
                data-hint-pattern={inPattern || undefined}
                data-hint-eliminate={eliminated ? true : undefined}
                data-hint-wrong={marks.wrong === index || undefined}
                aria-selected={isSelected}
                aria-label={cellLabel(index)}
                tabIndex={tabbable ? 0 : -1}
                onClick={() => onSelect(index)}
                onFocus={() => onSelect(index)}
              >
                {value !== 0 ? (
                  value
                ) : noteMask !== 0 ? (
                  <span className="notes" aria-hidden="true" data-preview={(!notes[index] && preview) || undefined}>
                    {DIGITS.map((digit) => {
                      const shown = hasNote(noteMask, digit);
                      return (
                        <span
                          key={digit}
                          data-match={(shown && digit === selectedValue) || undefined}
                          data-eliminate={(shown && eliminated?.has(digit)) || undefined}
                          data-pattern={(shown && inPattern && marks.patternDigits.has(digit)) || undefined}
                          data-add={digit === added || undefined}
                        >
                          {shown ? digit : ''}
                        </span>
                      );
                    })}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
