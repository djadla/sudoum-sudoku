import type { LessonFrame } from './lessons';

interface LessonBoardProps {
  readonly values: readonly number[];
  /** 예제의 기본 후보 (단계의 notes가 칸 단위로 덮어쓴다) */
  readonly notes?: Readonly<Record<number, readonly number[]>>;
  readonly frame: LessonFrame;
}

const CELLS = Array.from({ length: 81 }, (_, index) => index);
const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/**
 * 풀이 설명용 작은 보드. 의미는 단계 설명 문장이 전달하므로 화면 낭독기에서는 숨긴다.
 * 강조는 색만 쓰지 않고 테두리·빗금·밑줄·취소선을 함께 쓴다. (styles.css .lesson-board)
 */
export function LessonBoard({ values, notes, frame }: LessonBoardProps) {
  const region = new Set(frame.region ?? []);
  const shade = new Set(frame.shade ?? []);
  const pattern = new Set(frame.pattern ?? []);
  const mark = new Set((frame.mark ?? []).map(({ index, digit }) => `${index}:${digit}`));
  const strike = new Set((frame.strike ?? []).map(({ index, digit }) => `${index}:${digit}`));
  const shownNotes = { ...(notes ?? {}), ...(frame.notes ?? {}) };

  return (
    <div className="lesson-board" aria-hidden="true">
      {CELLS.map((index) => {
        const row = Math.floor(index / 9);
        const col = index % 9;
        const placed = frame.place?.index === index ? frame.place.digit : 0;
        const value = values[index] || placed;
        const cellNotes = shownNotes[index];
        const classes = ['lesson-cell'];
        if (col % 3 === 2 && col < 8) classes.push('box-right');
        if (row % 3 === 2 && row < 8) classes.push('box-bottom');
        return (
          <div
            key={index}
            className={classes.join(' ')}
            data-region={region.has(index) || undefined}
            data-shade={(shade.has(index) && !value) || undefined}
            data-pattern={pattern.has(index) || undefined}
            data-focus={frame.focus === index || undefined}
            data-placed={placed ? true : undefined}
          >
            {value ? (
              value
            ) : cellNotes ? (
              <span className="lesson-notes">
                {DIGITS.map((digit) => {
                  const shown = cellNotes.includes(digit);
                  const id = `${index}:${digit}`;
                  return (
                    <span
                      key={digit}
                      data-mark={(shown && mark.has(id)) || undefined}
                      data-strike={(shown && strike.has(id)) || undefined}
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
  );
}
