import { describe, expect, it } from 'vitest';
import { candidateMasks, findConflicts } from '../../engine/grid';
import { translate } from '../../i18n';
import en from '../../i18n/locales/en';
import ko from '../../i18n/locales/ko';
import { ADVANCED_TOPICS, BASIC_LESSONS, type Lesson } from './lessons';

const digitsOf = (mask: number) => [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => mask & (1 << d));

/** 예제가 설명하는 결론이 규칙상 실제로 성립하는지 검사한다. */
function verifyClaim({ values, claim }: Lesson) {
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
  }
}

describe.each(BASIC_LESSONS.map((lesson) => [lesson.id, lesson] as const))('기본 풀이: %s', (_, lesson) => {
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
        expect(lesson.values[frame.place.index]).toBe(0);
        if (lesson.claim.kind !== 'candidates') {
          expect(frame.place).toEqual({ index: lesson.claim.index, digit: lesson.claim.digit });
        } else {
          expect(lesson.claim.digits).toEqual([frame.place.digit]);
        }
      }
      for (const [cell, digits] of Object.entries(frame.notes ?? {})) {
        // 보여 주는 후보는 실제 후보와 같아야 한다.
        expect([...digits]).toEqual(digitsOf(candidateMasks(lesson.values)[Number(cell)]!));
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
    if (lesson.claim.kind !== 'hiddenSingle') throw new Error('claim');
    const emptyOthers = lesson.claim.house.filter((i) => lesson.values[i] === 0 && i !== lesson.claim.index);
    for (const cell of emptyOthers) expect(last.shade).toContain(cell);
    expect(last.shade).not.toContain(lesson.claim.index);
  });
});

describe('고급 풀이 목록', () => {
  it.each([
    ['en', en],
    ['ko', ko],
  ] as const)('%s: 제목과 설명이 있다', (_, messages) => {
    for (const topic of ADVANCED_TOPICS) {
      expect(translate(messages, topic.title)).not.toBe(topic.title);
      expect(translate(messages, topic.summary)).not.toBe(topic.summary);
    }
  });
});
