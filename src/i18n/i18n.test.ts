import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  loadMessages,
  loadMessagesOrFallback,
  normalizeLocale,
  readStoredLocale,
  resolveLocale,
  translate,
  writeStoredLocale,
  type Messages,
  type MessageTree,
} from './index';
import en from './locales/en';

function flatten(tree: MessageTree, prefix = '', entries = new Map<string, string>()): Map<string, string> {
  for (const [key, value] of Object.entries(tree)) {
    if (typeof value === 'string') entries.set(`${prefix}${key}`, value);
    else flatten(value, `${prefix}${key}.`, entries);
  }
  return entries;
}

function paramNames(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]!).sort();
}

describe('언어 리소스', () => {
  const source = flatten(en);

  it.each(SUPPORTED_LOCALES)('%s 리소스는 기준 언어와 키가 같다', async (locale) => {
    const target = flatten(await loadMessages(locale));
    expect([...target.keys()].sort()).toEqual([...source.keys()].sort());
  });

  it.each(SUPPORTED_LOCALES)('%s 리소스는 기준 언어와 {파라미터}가 같다', async (locale) => {
    const target = flatten(await loadMessages(locale));
    for (const [key, text] of source) {
      expect(paramNames(target.get(key) ?? ''), key).toEqual(paramNames(text));
    }
  });

  // ParamNames 타입은 {…} 안의 내용을 모두 이름으로 보지만 translate()는 {\w+}만 치환한다.
  // 두 동작이 어긋나지 않도록 리소스의 모든 {…}가 \w+ 형식인지 강제한다.
  it.each(SUPPORTED_LOCALES)('%s 리소스의 {파라미터} 이름은 영문·숫자·_만 쓴다', async (locale) => {
    for (const [key, text] of flatten(await loadMessages(locale))) {
      for (const [placeholder] of text.matchAll(/\{[^}]*\}/g)) {
        expect(placeholder, key).toMatch(/^\{\w+\}$/);
      }
      expect(text, key).not.toMatch(/\{[^}]*$/);
    }
  });

  it.each(SUPPORTED_LOCALES)('%s 리소스에 빈 문자열이 없다', async (locale) => {
    for (const [key, text] of flatten(await loadMessages(locale))) {
      expect(text.trim(), key).not.toBe('');
    }
  });
});

describe('translate', () => {
  it('파라미터를 채운다', () => {
    expect(translate(en, 'board.cellFilled', { row: 3, col: 5, value: 7 })).toBe('Row 3, column 5: 7');
  });

  it('현재 언어에 키가 없으면 기준 언어로 대신한다', () => {
    const partial = { ...en, board: { ...en.board, label: undefined } } as unknown as Messages;
    expect(translate(partial, 'board.label')).toBe(en.board.label);
  });

  it('넘기지 않은 파라미터는 그대로 남긴다', () => {
    expect(translate(en, 'puzzle.meta', { difficulty: 'Easy' })).toBe('Easy · Seed {seed}');
  });
});

describe('normalizeLocale', () => {
  it.each([
    ['ko-KR', 'ko'],
    ['KO', 'ko'],
    ['en_US', 'en'],
    ['ja-JP', null],
    ['', null],
    [null, null],
  ])('%s → %s', (input, expected) => {
    expect(normalizeLocale(input)).toBe(expected);
  });
});

describe('resolveLocale', () => {
  const base = { search: '', stored: null, languages: [] as string[] };

  it('URL 쿼리가 가장 우선한다', () => {
    expect(resolveLocale({ search: '?lang=ko', stored: 'en', languages: ['en-US'] })).toBe('ko');
  });

  it('지원하지 않는 쿼리 값은 무시한다', () => {
    expect(resolveLocale({ ...base, search: '?lang=xx', stored: 'ko' })).toBe('ko');
  });

  it('쿼리가 없으면 저장된 선택을 따른다', () => {
    expect(resolveLocale({ ...base, stored: 'ko', languages: ['en-US'] })).toBe('ko');
  });

  it('저장된 선택이 없으면 브라우저 언어 중 처음 지원하는 것을 고른다', () => {
    expect(resolveLocale({ ...base, languages: ['ja-JP', 'ko-KR', 'en-US'] })).toBe('ko');
  });

  it('아무것도 맞지 않으면 기본 언어를 쓴다', () => {
    expect(resolveLocale({ ...base, languages: ['ja-JP'] })).toBe(DEFAULT_LOCALE);
    expect(DEFAULT_LOCALE).toBe('en');
  });
});

describe('loadMessagesOrFallback', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('불러오기에 성공하면 요청한 언어를 쓴다', async () => {
    const result = await loadMessagesOrFallback('ko');
    expect(result.locale).toBe('ko');
    expect(result.messages.language.label).toBe('언어');
  });

  it('불러오기에 실패하면 기준 언어(en)로 대신한다', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const failing = () => Promise.reject(new Error('chunk load failed'));
    const result = await loadMessagesOrFallback('ko', failing);
    expect(result).toEqual({ locale: DEFAULT_LOCALE, messages: en });
    expect(console.warn).toHaveBeenCalledOnce();
  });
});

describe('언어 저장소', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const throwingStorage = {
    getItem: () => {
      throw new DOMException('denied', 'SecurityError');
    },
    setItem: () => {
      throw new DOMException('quota', 'QuotaExceededError');
    },
  };

  it('저장소 접근이 막혀도 읽기는 null을 돌려준다', () => {
    vi.stubGlobal('window', { localStorage: throwingStorage });
    expect(readStoredLocale()).toBeNull();
  });

  it('저장소 접근이 막혀도 쓰기는 예외를 던지지 않는다', () => {
    vi.stubGlobal('window', { localStorage: throwingStorage });
    expect(() => writeStoredLocale('ko')).not.toThrow();
  });

  it('localStorage 자체에 접근할 때 예외가 나도 동작한다', () => {
    vi.stubGlobal('window', {
      get localStorage(): Storage {
        throw new DOMException('denied', 'SecurityError');
      },
    });
    expect(readStoredLocale()).toBeNull();
    expect(() => writeStoredLocale('ko')).not.toThrow();
  });

  it('저장한 값을 다시 읽는다', () => {
    const store = new Map<string, string>();
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value),
      },
    });
    writeStoredLocale('ko');
    expect(readStoredLocale()).toBe('ko');
  });
});
