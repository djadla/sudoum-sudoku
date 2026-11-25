import { useEffect, useMemo, useRef } from 'react';
import { colOf, findConflicts, isPeer, rowOf } from '../engine/grid';
import { hasNote, isGiven, noteDigits, type GameState } from '../game/state';
import { useI18n } from '../i18n/I18nProvider';

interface BoardProps {
  readonly state: GameState;
  readonly onSelect: (index: number) => void;
}

const ROWS = Array.from({ length: 9 }, (_, row) => row);
const COLS = Array.from({ length: 9 }, (_, col) => col);
const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export function Board({ state, onSelect }: BoardProps) {
  const { t } = useI18n();
  const boardRef = useRef<HTMLDivElement>(null);
  const { selected, values, notes } = state;
  const selectedValue = selected === null ? 0 : values[selected]!;
  // 같은 행·열·박스에 같은 숫자가 겹친 칸 (주어진 숫자도 포함해 양쪽 모두 표시한다)
  const conflicts = useMemo(() => findConflicts(values), [values]);

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
    const label = isGiven(state, index)
      ? t('board.cellGiven', { ...position, value })
      : value !== 0
        ? t('board.cellFilled', { ...position, value })
        : null;
    if (label !== null) return conflicts[index] ? t('board.withDuplicate', { label }) : label;
    const marks = noteDigits(notes[index]!);
    if (marks.length > 0) return t('board.cellNotes', { ...position, notes: marks.join(', ') });
    return t('board.cellEmpty', position);
  }

  return (
    <div ref={boardRef} className="board" role="grid" aria-label={t('board.label')}>
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
                data-conflict={conflicts[index] || undefined}
                aria-selected={isSelected}
                aria-label={cellLabel(index)}
                tabIndex={tabbable ? 0 : -1}
                onClick={() => onSelect(index)}
                onFocus={() => onSelect(index)}
              >
                {value !== 0 ? (
                  value
                ) : notes[index] !== 0 ? (
                  <span className="notes" aria-hidden="true">
                    {DIGITS.map((digit) => (
                      <span key={digit} data-match={(digit === selectedValue && hasNote(notes[index]!, digit)) || undefined}>
                        {hasNote(notes[index]!, digit) ? digit : ''}
                      </span>
                    ))}
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
