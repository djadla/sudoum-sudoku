// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { THEME_KEY, loadTheme, saveTheme } from '../game/persistence';
import { renderWithI18n } from '../test/render';
import { AppMenu, applyTheme } from './AppMenu';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});
afterEach(cleanup);

describe('테마 저장·적용', () => {
  it('시스템은 저장하지 않고, 라이트·다크만 저장한다', () => {
    expect(loadTheme()).toBe('system');
    saveTheme('dark');
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');
    expect(loadTheme()).toBe('dark');
    saveTheme('system');
    expect(localStorage.getItem(THEME_KEY)).toBeNull();
    localStorage.setItem(THEME_KEY, 'neon');
    expect(loadTheme()).toBe('system');
  });

  it('적용하면 data-theme 속성을 바꾸고, 시스템이면 속성을 지운다', () => {
    applyTheme('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    applyTheme('system');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });
});

describe('AppMenu', () => {
  function setup() {
    const user = userEvent.setup();
    renderWithI18n(<AppMenu />);
    const toggle = screen.getByRole('button', { name: 'Menu' });
    return { user, toggle };
  }

  it('열면 선택된 화면 테마에 포커스를 주고(언어 목록 창이 열리지 않게), Esc로 닫으면 메뉴 버튼으로 돌려준다', async () => {
    localStorage.setItem(THEME_KEY, 'dark');
    const { user, toggle } = setup();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    await user.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    const panel = screen.getByRole('group', { name: 'Settings' });
    expect(document.activeElement).toBe(within(panel).getByRole('radio', { name: 'Dark' }));
    expect(document.activeElement).not.toBe(within(panel).getByRole('combobox', { name: 'Language' }));

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('group', { name: 'Settings' })).toBeNull();
    expect(document.activeElement).toBe(toggle);
  });

  it('메뉴 바깥을 누르면 닫는다', async () => {
    const { user, toggle } = setup();
    await user.click(toggle);
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('group', { name: 'Settings' })).toBeNull();
  });

  it('화면 테마를 고르면 바로 적용하고 저장한다', async () => {
    const { user, toggle } = setup();
    await user.click(toggle);
    const panel = screen.getByRole('group', { name: 'Settings' });
    const radios = within(panel).getAllByRole('radio');
    expect(radios.map((r) => (r as HTMLInputElement).checked)).toEqual([true, false, false]);

    await user.click(within(panel).getByRole('radio', { name: 'Dark' }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');

    await user.click(within(panel).getByRole('radio', { name: 'Match system' }));
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    expect(localStorage.getItem(THEME_KEY)).toBeNull();
  });

  it('저장된 테마로 시작한다', async () => {
    localStorage.setItem(THEME_KEY, 'light');
    const { user, toggle } = setup();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    await user.click(toggle);
    expect((screen.getByRole('radio', { name: 'Light' }) as HTMLInputElement).checked).toBe(true);
  });

  it('메뉴 안에서 언어를 바꿀 수 있다', async () => {
    const { user, toggle } = setup();
    await user.click(toggle);
    const select = screen.getByRole('combobox', { name: 'Language' });
    expect(within(select).getAllByRole('option').map((o) => o.textContent)).toEqual(['English', '한국어']);
  });
});
