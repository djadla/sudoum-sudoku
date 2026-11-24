import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { detectLocale, loadMessagesOrFallback } from './i18n';
import { I18nProvider } from './i18n/I18nProvider';
import './styles.css';

const root = document.getElementById('root');
if (!root) {
  throw new Error('#root 요소를 찾을 수 없습니다.');
}

// 첫 화면이 기준 언어로 깜빡이지 않도록 언어 리소스를 먼저 불러온 뒤 렌더링한다.
// 불러오지 못하면 앱 번들에 포함된 기준 언어(en)로 렌더링한다.
void loadMessagesOrFallback(detectLocale()).then(({ locale, messages }) => {
  createRoot(root).render(
    <StrictMode>
      <I18nProvider initialLocale={locale} initialMessages={messages}>
        <App />
      </I18nProvider>
    </StrictMode>,
  );
});
