import en from './locales/en';
import type { MessageKey, MessageParams, Messages, MessageTree } from './messages';

export type { MessageKey, Messages, MessageTree, PlainMessageKey, Translate } from './messages';

export const SUPPORTED_LOCALES = ['en', 'ko'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

/** 언어 선택기에 표시하는 이름. 각 언어를 그 언어로 적으므로 번역하지 않는다. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  ko: '한국어',
};

export const LOCALE_STORAGE_KEY = 'sudoum.locale';
export const LOCALE_QUERY_PARAM = 'lang';

type Loader = () => Promise<{ default: Messages }>;

/** 기준 언어(en)는 앱 번들에 포함하고, 나머지는 필요할 때 불러온다. */
const loaders: Record<Exclude<Locale, 'en'>, Loader> = {
  ko: () => import('./locales/ko'),
};

export async function loadMessages(locale: Locale): Promise<Messages> {
  if (locale === 'en') return en;
  return (await loaders[locale]()).default;
}

export interface LoadedLocale {
  readonly locale: Locale;
  readonly messages: Messages;
}

/**
 * 언어 리소스를 불러오고, 실패하면 기준 언어(en)로 대신한다.
 * 배포 직후 이전 HTML이 사라진 청크를 찾는 경우 등에도 화면이 비지 않게 하기 위해서다.
 */
export async function loadMessagesOrFallback(
  locale: Locale,
  load: (locale: Locale) => Promise<Messages> = loadMessages,
): Promise<LoadedLocale> {
  try {
    return { locale, messages: await load(locale) };
  } catch (error) {
    console.warn(`[i18n] '${locale}' 리소스를 불러오지 못해 '${DEFAULT_LOCALE}'로 표시합니다.`, error);
    return { locale: DEFAULT_LOCALE, messages: en };
  }
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/** 'ko-KR', 'KO' 같은 값을 지원 언어로 바꾼다. 지원하지 않으면 null. */
export function normalizeLocale(value: string | null | undefined): Locale | null {
  if (!value) return null;
  const language = value.trim().toLowerCase().split(/[-_]/)[0];
  return isLocale(language) ? language : null;
}

export interface LocaleSources {
  /** location.search (예: '?lang=ko') */
  readonly search: string;
  /** localStorage에 저장된 값 */
  readonly stored: string | null;
  /** navigator.languages */
  readonly languages: readonly string[];
}

/** URL 쿼리 → 저장된 선택 → 브라우저 언어 → 기본값 순서로 언어를 정한다. (ADR-0002) */
export function resolveLocale({ search, stored, languages }: LocaleSources): Locale {
  const fromQuery = normalizeLocale(new URLSearchParams(search).get(LOCALE_QUERY_PARAM));
  if (fromQuery) return fromQuery;

  const fromStorage = normalizeLocale(stored);
  if (fromStorage) return fromStorage;

  for (const language of languages) {
    const match = normalizeLocale(language);
    if (match) return match;
  }
  return DEFAULT_LOCALE;
}

function lookup(messages: Messages, key: MessageKey): string | undefined {
  let node: string | MessageTree | undefined = messages;
  for (const part of key.split('.')) {
    if (node === undefined || typeof node === 'string') return undefined;
    node = node[part];
  }
  return typeof node === 'string' ? node : undefined;
}

/**
 * 메시지를 찾아 {파라미터}를 채운다.
 * 현재 언어에 없으면 기준 언어(en)를, 그래도 없으면 키를 그대로 돌려준다.
 */
export function translate(messages: Messages, key: MessageKey, params?: MessageParams): string {
  const template = lookup(messages, key) ?? lookup(en, key) ?? key;
  if (!params) return template;
  // 파라미터 문법을 바꾸면 messages.ts의 ParamNames 타입과 테스트의 정규식도 함께 바꾼다.
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

/** localStorage를 쓸 수 없는 환경(사생활 보호 모드 등)에서도 동작하도록 예외를 삼킨다. */
export function readStoredLocale(): string | null {
  try {
    return window.localStorage.getItem(LOCALE_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function writeStoredLocale(locale: Locale): void {
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // 저장하지 못해도 이번 방문 동안은 선택한 언어로 동작한다.
  }
}

export function detectLocale(): Locale {
  return resolveLocale({
    search: window.location.search,
    stored: readStoredLocale(),
    languages: navigator.languages ?? [navigator.language],
  });
}
