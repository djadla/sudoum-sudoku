import { useId } from 'react';
import { LOCALE_NAMES, SUPPORTED_LOCALES, isLocale } from '../i18n';
import { useI18n } from '../i18n/I18nProvider';

export function LanguageSelect() {
  const { locale, t, setLocale } = useI18n();
  const id = useId();

  return (
    <div className="language-select">
      <label htmlFor={id}>{t('language.label')}</label>
      <select
        id={id}
        value={locale}
        onChange={(event) => {
          if (isLocale(event.target.value)) setLocale(event.target.value);
        }}
      >
        {SUPPORTED_LOCALES.map((code) => (
          <option key={code} value={code} lang={code}>
            {LOCALE_NAMES[code]}
          </option>
        ))}
      </select>
    </div>
  );
}
