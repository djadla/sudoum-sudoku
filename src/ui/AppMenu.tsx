import { useEffect, useId, useRef, useState } from 'react';
import { loadTheme, saveTheme, type ThemePreference } from '../game/persistence';
import { useI18n } from '../i18n/I18nProvider';
import { LanguageSelect } from './LanguageSelect';

const THEMES = [
  { id: 'system', label: 'menu.themeSystem' },
  { id: 'light', label: 'menu.themeLight' },
  { id: 'dark', label: 'menu.themeDark' },
] as const satisfies readonly { id: ThemePreference; label: string }[];

/** 테마를 문서에 적용한다. 'system'이면 속성을 지워 CSS가 시스템 설정을 따르게 한다. (styles.css) */
export function applyTheme(theme: ThemePreference): void {
  if (theme === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', theme);
}

/**
 * 헤더의 ☰ 메뉴. 좁은 화면에서 헤더에 버튼을 계속 늘리지 않도록 설정을 한곳에 모은다.
 * (지금은 언어·화면 테마, 이후 공유·기록이 들어온다)
 * 열면 선택된 화면 테마로 포커스를 옮기고, Esc로 닫으면 ☰ 버튼으로 돌려준다. (바깥 클릭으로 닫으면 누른 곳에 포커스가 간다)
 */
export function AppMenu() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<ThemePreference>(loadTheme);
  const panelId = useId();
  const titleId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // 저장된 테마는 index.html이 먼저 적용하지만, 상태와 문서 속성을 항상 맞춰 둔다.
  useEffect(() => applyTheme(theme), [theme]);

  useEffect(() => {
    if (!open) return;
    // 처음 포커스는 선택된 화면 테마에 둔다. 언어 선택(select)에 포커스를 주면 휴대폰에서
    // 목록 창이 바로 열려 버리기 때문이다. (2026-11-28 사용자 실기기 피드백)
    panelRef.current?.querySelector<HTMLInputElement>('.theme-choice input:checked')?.focus();
    const close = (returnFocus: boolean) => {
      setOpen(false);
      if (returnFocus) toggleRef.current?.focus();
    };
    // 새 게임 메뉴와 같은 방식: capture 단계에서 Esc를 먼저 받아 처리했음을 알린다. (대화상자 안의 Esc는 건너뜀)
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      if (event.target instanceof Element && event.target.closest('dialog')) return;
      event.preventDefault();
      close(true);
    }
    // 메뉴 바깥을 누르면 닫는다. (☰ 버튼 자신은 onClick에서 처리)
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || toggleRef.current?.contains(target)) return;
      close(false);
    }
    window.addEventListener('keydown', onKeyDown, { capture: true });
    window.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown, { capture: true });
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  function chooseTheme(next: ThemePreference) {
    setTheme(next);
    saveTheme(next);
  }

  return (
    <div className="app-menu">
      <button
        ref={toggleRef}
        type="button"
        className="tool icon"
        aria-label={t('menu.button')}
        title={t('menu.button')}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true">☰</span>
      </button>
      {open && (
        <div
          ref={panelRef}
          id={panelId}
          className="app-menu-panel"
          role="group"
          aria-labelledby={titleId}
          data-no-game-keys
        >
          <p id={titleId} className="new-game-title">
            {t('menu.title')}
          </p>
          <LanguageSelect />
          <fieldset className="theme-choice">
            <legend>{t('menu.theme')}</legend>
            {THEMES.map((item) => (
              <label key={item.id}>
                <input
                  type="radio"
                  name={`${panelId}-theme`}
                  value={item.id}
                  checked={theme === item.id}
                  onChange={() => chooseTheme(item.id)}
                />
                {t(item.label)}
              </label>
            ))}
          </fieldset>
        </div>
      )}
    </div>
  );
}
