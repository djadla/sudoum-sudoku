// @vitest-environment happy-dom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Locale, Messages } from './index';
import { I18nProvider, useI18n } from './I18nProvider';
import en from './locales/en';
import ko from './locales/ko';

// 언어 리소스 로딩을 테스트가 직접 제어한다.
const pending = new Map<Locale, { resolve: (m: Messages) => void; reject: (e: Error) => void }>();

vi.mock('./index', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./index')>();
  return {
    ...actual,
    loadMessages: (locale: Locale) =>
      new Promise<Messages>((resolve, reject) => pending.set(locale, { resolve, reject })),
  };
});

function Probe() {
  const { locale, t, setLocale } = useI18n();
  return (
    <div>
      <p data-testid="locale">{locale}</p>
      <p data-testid="label">{t('language.label')}</p>
      <button onClick={() => setLocale('ko')}>ko</button>
      <button onClick={() => setLocale('en')}>en</button>
    </div>
  );
}

function setup() {
  document.head.innerHTML = '<meta name="description" content="">';
  render(
    <I18nProvider initialLocale="en" initialMessages={en}>
      <Probe />
    </I18nProvider>,
  );
}

const click = (name: string) => act(() => screen.getByRole('button', { name }).click());
const settle = (locale: Locale, messages: Messages) =>
  act(async () => {
    pending.get(locale)!.resolve(messages);
  });

beforeEach(() => {
  pending.clear();
  localStorage.clear();
  window.history.replaceState(null, '', '/sudoum-sudoku/');
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('I18nProvider', () => {
  it('처음 렌더링하면 문서의 lang·title·description을 현재 언어로 맞춘다', () => {
    setup();
    expect(document.documentElement.lang).toBe('en');
    expect(document.title).toBe(en.app.documentTitle);
    expect(document.querySelector('meta[name="description"]')!.getAttribute('content')).toBe(en.app.description);
  });

  it('언어를 바꾸면 리소스를 불러온 뒤 화면·문서·저장소를 갱신하고 ?lang=을 지운다', async () => {
    window.history.replaceState(null, '', '/sudoum-sudoku/?lang=en&seed=1');
    setup();
    click('ko');
    // 불러오기 전에는 아무것도 바꾸지 않는다.
    expect(screen.getByTestId('locale').textContent).toBe('en');
    expect(localStorage.getItem('sudoum.locale')).toBeNull();

    await settle('ko', ko);
    expect(screen.getByTestId('label').textContent).toBe('언어');
    expect(document.documentElement.lang).toBe('ko');
    expect(document.title).toBe(ko.app.documentTitle);
    expect(localStorage.getItem('sudoum.locale')).toBe('ko');
    expect(window.location.search).toBe('?seed=1');
  });

  it('언어를 빠르게 바꾸면 마지막 선택만 반영한다', async () => {
    setup();
    click('ko');
    click('en');
    await settle('en', en);
    await settle('ko', ko); // 늦게 끝난 이전 요청
    expect(screen.getByTestId('locale').textContent).toBe('en');
    expect(localStorage.getItem('sudoum.locale')).toBe('en');
  });

  it('불러오기에 실패하면 현재 언어를 유지한다', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    setup();
    click('ko');
    await act(async () => {
      pending.get('ko')!.reject(new Error('chunk load failed'));
    });
    expect(screen.getByTestId('locale').textContent).toBe('en');
    expect(document.documentElement.lang).toBe('en');
    expect(localStorage.getItem('sudoum.locale')).toBeNull();
    expect(console.warn).toHaveBeenCalledOnce();
  });
});
