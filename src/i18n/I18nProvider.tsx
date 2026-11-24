import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  LOCALE_QUERY_PARAM,
  loadMessages,
  translate,
  writeStoredLocale,
  type Locale,
  type Messages,
  type Translate,
} from './index';

interface I18nContextValue {
  readonly locale: Locale;
  readonly t: Translate;
  readonly setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

interface I18nProviderProps {
  readonly initialLocale: Locale;
  /** 첫 화면이 기준 언어로 깜빡이지 않도록, 렌더링 전에 불러온 리소스를 받는다. */
  readonly initialMessages: Messages;
  readonly children: ReactNode;
}

/** 언어를 고르면 공유 링크의 ?lang= 보다 사용자의 선택이 우선하도록 쿼리를 지운다. */
function removeLocaleQuery(): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(LOCALE_QUERY_PARAM)) return;
  url.searchParams.delete(LOCALE_QUERY_PARAM);
  window.history.replaceState(window.history.state, '', url);
}

export function I18nProvider({ initialLocale, initialMessages, children }: I18nProviderProps) {
  const [state, setState] = useState({ locale: initialLocale, messages: initialMessages });
  // 언어를 빠르게 여러 번 바꿨을 때 마지막 선택만 반영한다.
  const latestRequest = useRef(0);

  // 불러오기에 성공한 뒤에만 저장·쿼리 제거·화면 전환을 한다.
  // 실패하면 현재 언어를 그대로 유지한다. (선택기도 현재 언어로 남는다)
  const setLocale = useCallback((locale: Locale) => {
    const request = ++latestRequest.current;
    loadMessages(locale).then(
      (messages) => {
        if (request !== latestRequest.current) return;
        writeStoredLocale(locale);
        removeLocaleQuery();
        setState({ locale, messages });
      },
      (error: unknown) => {
        console.warn(`[i18n] '${locale}' 리소스를 불러오지 못해 언어를 바꾸지 않았습니다.`, error);
      },
    );
  }, []);

  const t = useCallback<Translate>(
    (key, ...params) => translate(state.messages, key, params[0]),
    [state.messages],
  );

  // 화면 낭독기와 브라우저 탭이 현재 언어를 따르도록 문서 정보를 맞춘다.
  useEffect(() => {
    document.documentElement.lang = state.locale;
    document.title = t('app.documentTitle');
    document.querySelector('meta[name="description"]')?.setAttribute('content', t('app.description'));
  }, [state.locale, t]);

  const value = useMemo(() => ({ locale: state.locale, t, setLocale }), [state.locale, t, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n은 I18nProvider 안에서만 쓸 수 있습니다.');
  return context;
}
