import { render, type RenderResult } from '@testing-library/react';
import type { ReactElement } from 'react';
import { I18nProvider } from '../i18n/I18nProvider';
import en from '../i18n/locales/en';

/** 기준 언어(en)로 I18nProvider를 씌워 렌더링한다. */
export function renderWithI18n(ui: ReactElement): RenderResult {
  return render(
    <I18nProvider initialLocale="en" initialMessages={en}>
      {ui}
    </I18nProvider>,
  );
}
