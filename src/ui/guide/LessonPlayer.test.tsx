// @vitest-environment happy-dom
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithI18n } from '../../test/render';
import { GuideDialog } from '../GuideDialog';
import { BASIC_LESSONS } from './lessons';
import { LessonPlayer, STEP_MS } from './LessonPlayer';

const hidden = BASIC_LESSONS.find((l) => l.id === 'hiddenSingle')!;

function mockReducedMotion(reduce: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({ matches: reduce && query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {} })),
  );
}

beforeEach(() => mockReducedMotion(false));
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('LessonPlayer', () => {
  it('자동으로 다음 단계로 넘어가고, 마지막 단계 뒤에는 처음으로 돌아간다', () => {
    vi.useFakeTimers();
    renderWithI18n(<LessonPlayer lesson={hidden} />);
    expect(screen.getByText('Step 1 of 4')).toBeTruthy();
    act(() => vi.advanceTimersByTime(STEP_MS));
    expect(screen.getByText('Step 2 of 4')).toBeTruthy();
    // 다음 단계 타이머는 다시 그린 뒤에 걸리므로 단계마다 나눠서 넘긴다.
    act(() => vi.advanceTimersByTime(STEP_MS));
    act(() => vi.advanceTimersByTime(STEP_MS));
    expect(screen.getByText('Step 4 of 4')).toBeTruthy();
    // 마지막 단계는 두 배로 머문다.
    act(() => vi.advanceTimersByTime(STEP_MS));
    expect(screen.getByText('Step 4 of 4')).toBeTruthy();
    act(() => vi.advanceTimersByTime(STEP_MS));
    expect(screen.getByText('Step 1 of 4')).toBeTruthy();
  });

  it('직접 넘기면 자동 재생을 멈추고, 설명을 화면 낭독기가 읽도록 한다', () => {
    vi.useFakeTimers();
    renderWithI18n(<LessonPlayer lesson={hidden} />);
    const caption = document.querySelector('figcaption')!;
    expect(caption.getAttribute('aria-live')).toBe('off');

    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    expect(screen.getByText('Step 2 of 4')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Play' })).toBeTruthy();
    expect(caption.getAttribute('aria-live')).toBe('polite');
    act(() => vi.advanceTimersByTime(STEP_MS * 5));
    expect(screen.getByText('Step 2 of 4')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Previous step' }));
    fireEvent.click(screen.getByRole('button', { name: 'Previous step' }));
    expect(screen.getByText('Step 4 of 4')).toBeTruthy(); // 처음에서 이전이면 마지막으로
  });

  it('동작 줄이기를 켠 사용자에게는 자동 재생하지 않는다', () => {
    mockReducedMotion(true);
    vi.useFakeTimers();
    renderWithI18n(<LessonPlayer lesson={hidden} />);
    expect(screen.getByRole('button', { name: 'Play' })).toBeTruthy();
    act(() => vi.advanceTimersByTime(STEP_MS * 3));
    expect(screen.getByText('Step 1 of 4')).toBeTruthy();
  });

  it('마지막 단계에서 숫자를 채우고, 보드는 화면 낭독기에서 숨긴다 (설명 문장이 의미를 전달)', () => {
    renderWithI18n(<LessonPlayer lesson={hidden} />);
    fireEvent.click(screen.getByRole('button', { name: 'Previous step' }));
    const board = document.querySelector('.lesson-board')!;
    expect(board.getAttribute('aria-hidden')).toBe('true');
    const placed = board.querySelector('[data-placed]')!;
    expect(placed.textContent).toBe('1');
    expect(placed.hasAttribute('data-focus')).toBe(true);
    expect(screen.getByText(/Only R1C1 is left/)).toBeTruthy();
  });
});

describe('도움말 탭', () => {
  function openGuide() {
    renderWithI18n(<GuideDialog open onClose={() => {}} />);
    return screen.getByRole('dialog', { hidden: true });
  }

  it('세 탭이 있고 처음에는 플레이 방법을 보여 준다', () => {
    const dialog = openGuide();
    const tabs = within(dialog).getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['How to play', 'Basic solving', 'Advanced solving']);
    expect(tabs[0]!.getAttribute('aria-selected')).toBe('true');
    const panel = within(dialog).getByRole('tabpanel');
    expect(panel.getAttribute('aria-labelledby')).toBe(tabs[0]!.id);
    expect(within(panel).getByText('Rules')).toBeTruthy();
    // 선택된 탭만 Tab 키로 들어온다.
    expect(tabs.map((t) => t.tabIndex)).toEqual([0, -1, -1]);
  });

  it('방향키·Home·End로 탭을 옮긴다', () => {
    const dialog = openGuide();
    const tabs = within(dialog).getAllByRole('tab');
    tabs[0]!.focus();
    fireEvent.keyDown(tabs[0]!, { key: 'ArrowRight' });
    expect(tabs[1]!.getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(tabs[1]);
    fireEvent.keyDown(tabs[1]!, { key: 'End' });
    expect(tabs[2]!.getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(tabs[2]!, { key: 'ArrowRight' });
    expect(tabs[0]!.getAttribute('aria-selected')).toBe('true'); // 끝에서 처음으로
    fireEvent.keyDown(tabs[0]!, { key: 'ArrowLeft' });
    expect(tabs[2]!.getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(tabs[2]!, { key: 'Home' });
    expect(tabs[0]!.getAttribute('aria-selected')).toBe('true');
  });

  it('기본 풀이 탭에서 기법을 골라 설명을 본다', () => {
    const dialog = openGuide();
    fireEvent.click(within(dialog).getByRole('tab', { name: 'Basic solving' }));
    const panel = within(dialog).getByRole('tabpanel');
    const chips = within(panel).getAllByRole('button', { pressed: undefined }).filter((b) => b.hasAttribute('aria-pressed'));
    expect(chips.map((c) => c.textContent)).toEqual(['Open Single', 'Hidden Single', 'Writing candidates', 'Naked Single']);
    expect(chips[0]!.getAttribute('aria-pressed')).toBe('true');
    expect(within(panel).getByText('Row 1 has only one empty cell.')).toBeTruthy();

    fireEvent.click(chips[2]!);
    expect(chips[2]!.getAttribute('aria-pressed')).toBe('true');
    expect(within(panel).getByRole('heading', { name: 'Writing candidates' })).toBeTruthy();
    expect(within(panel).getByText('Step 1 of 4')).toBeTruthy(); // 기법을 바꾸면 처음부터
  });

  it('고급 풀이 탭에서 기법 6개를 골라 후보를 지우는 설명을 본다', () => {
    const dialog = openGuide();
    fireEvent.click(within(dialog).getByRole('tab', { name: 'Advanced solving' }));
    const panel = within(dialog).getByRole('tabpanel');
    const chips = [...panel.querySelectorAll('.lesson-chips button')].map((b) => b.textContent);
    expect(chips).toEqual(['Pointing', 'Naked Pair', 'Naked Triple', 'Hidden Pair', 'X-Wing', 'Y-Wing']);
    expect(within(panel).getByText('Look at the candidates for 5 in box 1 (top left).')).toBeTruthy();
    // 예제 후보와 근거 후보(밑줄)를 보여 준다.
    expect(panel.querySelectorAll('.lesson-notes').length).toBeGreaterThan(5);
    expect(panel.querySelectorAll('.lesson-notes [data-mark]').length).toBe(2);
  });

  it('후보를 지우는 단계에서는 지울 후보에 취소선을 긋는다', () => {
    const dialog = openGuide();
    fireEvent.click(within(dialog).getByRole('tab', { name: 'Advanced solving' }));
    const panel = within(dialog).getByRole('tabpanel');
    fireEvent.click(within(panel).getByRole('button', { name: 'X-Wing' }));
    for (let i = 0; i < 3; i++) fireEvent.click(within(panel).getByRole('button', { name: 'Next step' }));
    expect(within(panel).getByText('Step 4 of 4')).toBeTruthy();
    const struck = [...panel.querySelectorAll('.lesson-notes [data-strike]')].map((e) => e.textContent);
    expect(struck).toEqual(['4', '4', '4']);
  });
});
