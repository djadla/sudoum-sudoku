import { describe, expect, it } from 'vitest';
import { indexOf } from '../engine/grid';
import { computeHint } from '../engine/hint';
import { TACTIC_KEYS, type HintView } from '../engine/hintTypes';
import { createPuzzle } from '../engine/puzzle';
import { translate, type MessageKey, type Messages, type Translate } from '../i18n';
import en from '../i18n/locales/en';
import ko from '../i18n/locales/ko';
import { describeHint } from './hintText';

const translator = (messages: Messages): Translate =>
  ((key: MessageKey, params?: Record<string, string | number>) => translate(messages, key, params)) as Translate;
const tEn = translator(en);
const tKo = translator(ko);

type Technique = Extract<HintView, { kind: 'technique' }>;
const technique = (partial: Partial<Technique>): Technique => ({
  kind: 'technique',
  tactic: 'pointing',
  action: 'eliminate',
  digit: 9,
  focusCell: null,
  regionCells: [],
  patternCells: [],
  patternDigits: [9],
  placements: [],
  eliminations: [],
  candidates: Array(81).fill(0),
  ...partial,
});

/** 힌트를 따라가며 실제로 나오는 힌트를 모은다. */
function collectHints(level: 'L2' | 'L4' | 'L6' | 'L8' | 'L10', seed: number): HintView[] {
  const puzzle = createPuzzle(level, seed);
  const values = [...puzzle.givens];
  const notes = Array<number>(81).fill(0);
  const hints: HintView[] = [];
  for (let step = 0; step < 400; step++) {
    const hint = computeHint(values, notes);
    if (!hint) break;
    hints.push(hint);
    if (hint.kind === 'technique') {
      for (const { index, digit } of hint.placements) {
        values[index] = digit;
        notes[index] = 0;
      }
      for (const { index, digit } of hint.eliminations) notes[index] = (notes[index] || hint.candidates[index]!) & ~(1 << digit);
    } else if (hint.kind === 'missingNote') {
      notes[hint.cell] = notes[hint.cell]! | (1 << hint.digit);
    } else if (hint.kind === 'impossibleNote') {
      notes[hint.cell] = notes[hint.cell]! & ~(1 << hint.digit);
    }
  }
  return hints;
}

describe('기법 이름', () => {
  it.each([
    ['en', en],
    ['ko', ko],
  ] as const)('%s: 모든 기법 키에 이름이 있다', (_, messages) => {
    expect(Object.keys(messages.hint.tactic).sort()).toEqual([...TACTIC_KEYS].sort());
  });

  it('한국어는 우리말 이름에 원어를 함께 적고, 고유명사로 쓰는 기법은 원어만 쓴다 (ADR-0002)', () => {
    expect(ko.hint.tactic.hiddenSingle).toBe('숨은 싱글 (Hidden Single)');
    expect(ko.hint.tactic.xWing).toBe('X-Wing');
  });
});

describe('describeHint: 실제 힌트', () => {
  const hints = [
    ...collectHints('L2', 7),
    ...collectHints('L4', 8),
    ...collectHints('L6', 9),
    ...collectHints('L8', 10),
  ];

  it('여러 기법이 실제로 나온다', () => {
    const tactics = new Set(hints.flatMap((h) => (h.kind === 'technique' ? [h.tactic] : [])));
    expect(tactics.size).toBeGreaterThanOrEqual(4);
  });

  it.each([
    ['en', tEn],
    ['ko', tKo],
  ] as const)('%s: 모든 힌트 문장에 채우지 않은 {파라미터}나 빈 문장이 없다', (_, t) => {
    for (const hint of hints) {
      const text = describeHint(t, hint);
      const all = `${text.title} ${text.body} ${text.removals ?? ''}`;
      expect(all, JSON.stringify(hint)).not.toMatch(/[{}]/);
      expect(text.title.trim()).not.toBe('');
      expect(text.body.trim()).not.toBe('');
    }
  });

  it('후보 지우기 힌트에는 지울 후보 목록이 있고, 배치 힌트에는 없다', () => {
    for (const hint of hints) {
      if (hint.kind !== 'technique') continue;
      const text = describeHint(tEn, hint);
      if (hint.action === 'eliminate') expect(text.removals).toMatch(/^Remove: /);
      else expect(text.removals).toBeNull();
    }
  });
});

describe('describeHint: 문장 선택', () => {
  it('틀린 숫자', () => {
    const text = describeHint(tKo, { kind: 'wrongValue', cell: indexOf(2, 4), digit: 7 });
    expect(text.title).toBe('틀린 숫자');
    expect(text.body).toBe('3행 5열에 넣은 숫자(7)는 정답이 아닙니다. 지우고 다시 생각해 보세요.');
  });

  it('포인팅: 박스 안의 후보가 한 줄에 모이면 그 줄의 나머지 칸에서 지운다', () => {
    // 1번 박스의 1행 두 칸에만 9가 있고, 1행의 다른 칸에서 9를 지운다.
    const hint = technique({
      patternCells: [indexOf(0, 0), indexOf(0, 2)],
      eliminations: [{ index: indexOf(0, 5), digit: 9 }],
    });
    expect(describeHint(tEn, hint).body).toBe(
      'In box 1, 9 can only go in row 1. So 9 can be removed from the other cells of row 1.',
    );
  });

  it('포인팅: 줄의 후보가 한 박스에 모이면 그 박스의 나머지 칸에서 지운다', () => {
    // 8행의 9는 7번 박스 안에만 있고, 7번 박스의 다른 칸(7행·9행)에서 9를 지운다. (실제로 나온 사례)
    const hint = technique({
      patternCells: [indexOf(7, 0), indexOf(7, 2)],
      eliminations: [
        { index: indexOf(6, 2), digit: 9 },
        { index: indexOf(8, 0), digit: 9 },
      ],
    });
    expect(describeHint(tKo, hint).body).toBe(
      '8행에서 숫자(9)가 들어갈 수 있는 칸은 모두 7번 박스 안에 있습니다. 그래서 7번 박스의 나머지 칸에서는 후보 숫자(9)를 지울 수 있습니다.',
    );
  });

  it('X-Wing: 지울 칸이 있는 쪽을 교차선으로 설명한다', () => {
    // 4행·9행의 7이 2열·4열에만 있어, 2열·4열의 다른 칸에서 7을 지운다. (실제로 나온 사례)
    const hint = technique({
      tactic: 'xWing',
      digit: 7,
      patternDigits: [7],
      patternCells: [indexOf(3, 1), indexOf(3, 3), indexOf(8, 1), indexOf(8, 3)],
      eliminations: [
        { index: indexOf(4, 1), digit: 7 },
        { index: indexOf(7, 1), digit: 7 },
      ],
    });
    expect(describeHint(tEn, hint).body).toBe(
      'In row 4 and row 9, 7 can only go in column 2 and column 4. Each of those two lines puts one 7 in column 2 and column 4, so 7 can be removed from the other cells of column 2 and column 4.',
    );
    expect(describeHint(tKo, hint).body).toBe(
      '4행·9행에서 숫자(7)가 들어갈 수 있는 칸은 모두 2열·4열에 있습니다. 두 줄이 각각 2열·4열에 숫자(7)를 하나씩 놓으므로, 2열·4열의 다른 칸에서 후보 숫자(7)를 지울 수 있습니다.',
    );
  });

  it('숨은 쌍: 쌍 숫자(patternDigits)를 잠긴 숫자로 설명한다 (sudoku-core 영어 설명과 달리)', () => {
    const hint = technique({
      tactic: 'hiddenPair',
      digit: 2,
      patternDigits: [3, 6],
      regionCells: Array.from({ length: 9 }, (_, row) => indexOf(row, 6)),
      patternCells: [indexOf(6, 6), indexOf(7, 6)],
      eliminations: [
        { index: indexOf(6, 6), digit: 2 },
        { index: indexOf(7, 6), digit: 9 },
      ],
    });
    const text = describeHint(tKo, hint);
    expect(text.body).toBe(
      '7열에서 숫자들(3, 6)이 들어갈 수 있는 칸은 7행 7열, 8행 7열의 2칸뿐입니다. 그래서 이 칸들에는 다른 숫자가 들어갈 수 없어 나머지 후보를 지울 수 있습니다.',
    );
    expect(text.removals).toBe('지울 후보: 7행 7열의 2, 8행 7열의 9');
  });

  it('전용 문장이 없는 고급 기법은 공통 문장으로 설명한다', () => {
    const hint = technique({ tactic: 'yWing', digit: 5, eliminations: [{ index: 78, digit: 5 }] });
    expect(describeHint(tEn, hint).body).toBe(
      'Using Y-Wing, the pattern in the highlighted cells rules out 5 from the marked cells.',
    );
  });

  it('지울 후보가 없는 예상 밖의 포인팅·X-Wing 데이터는 전용 문장 대신 공통 문장으로 설명한다', () => {
    const pointing = technique({ patternCells: [indexOf(0, 0), indexOf(0, 2)], eliminations: [] });
    expect(describeHint(tEn, pointing).body).toMatch(/^Using Pointing/);
    const xWing = technique({
      tactic: 'xWing',
      patternCells: [indexOf(3, 1), indexOf(3, 3), indexOf(8, 1), indexOf(8, 3)],
      eliminations: [],
    });
    expect(describeHint(tEn, xWing).body).toMatch(/^Using X-Wing/);
  });

  it('드러난 그룹은 칸들의 후보를 합친 것이 그룹 숫자뿐이라고 설명한다', () => {
    const hint = technique({
      tactic: 'nakedTriple',
      patternDigits: [1, 2, 3],
      regionCells: Array.from({ length: 9 }, (_, col) => indexOf(0, col)),
      patternCells: [indexOf(0, 0), indexOf(0, 1), indexOf(0, 2)],
      eliminations: [{ index: indexOf(0, 5), digit: 2 }],
    });
    expect(describeHint(tKo, hint).body).toBe(
      '1행에서 1행 1열, 1행 2열, 1행 3열의 3칸에 있는 후보를 모두 합쳐도 1, 2, 3뿐입니다. 이 숫자들은 이 칸들에 들어가야 하므로 1행의 다른 칸에서 지울 수 있습니다.',
    );
  });
});
