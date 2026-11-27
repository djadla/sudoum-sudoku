// @vitest-environment happy-dom
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import type { PuzzleLevel } from './engine/difficulty';
import { createPuzzle, type Puzzle } from './engine/puzzle';
import { DIFFICULTY_KEY, SAVE_KEY, saveGame, toSavedGame } from './game/persistence';
import { createGame, gameReducer } from './game/state';
import { renderWithI18n } from './test/render';

// 퍼즐 생성을 테스트가 직접 끝낸다.
type Deferred = { level: PuzzleLevel; resolve: (p: Puzzle) => void; reject: (e: Error) => void };
const requests: Deferred[] = [];

vi.mock('./workers/generatePuzzle', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./workers/generatePuzzle')>();
  return {
    ...actual,
    generatePuzzle: vi.fn(
      (level: PuzzleLevel) =>
        new Promise<Puzzle>((resolve, reject) => requests.push({ level, resolve, reject })),
    ),
  };
});

const easy = createPuzzle('L2', 4242);
/** 높은 레벨은 생성이 느리므로 쉬운 퍼즐에 레벨만 바꿔 쓴다. (화면 흐름만 확인한다) */
const asLevel = (level: PuzzleLevel, seed: number): Puzzle => ({ ...easy, difficulty: level, seed });

const resolveLast = (puzzle: Puzzle) =>
  act(async () => {
    requests.at(-1)!.resolve(puzzle);
  });

const cells = () => within(screen.getByRole('grid')).getAllByRole('gridcell');
const savedJson = () => JSON.parse(localStorage.getItem(SAVE_KEY) ?? 'null');

beforeEach(() => {
  requests.length = 0;
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('App', () => {
  it('저장이 없으면 기본 난이도(쉬움)로 퍼즐을 만들고, 만드는 동안 안내를 보여 준다', async () => {
    renderWithI18n(<App />);
    expect(screen.getByRole('status').textContent).toContain('Creating a puzzle (Easy)');
    expect(screen.queryByRole('grid')).toBeNull();
    expect(requests.map((r) => r.level)).toEqual(['L2']);

    await resolveLast(easy);
    expect(cells()).toHaveLength(81);
    expect(screen.getByText(`Easy · Seed ${easy.seed}`)).toBeTruthy();
    // 시작하자마자 저장한다.
    expect(savedJson().puzzle.seed).toBe(easy.seed);
  });

  it('마지막으로 고른 난이도로 시작한다', () => {
    localStorage.setItem(DIFFICULTY_KEY, 'expert');
    renderWithI18n(<App />);
    expect(requests.map((r) => r.level)).toEqual(['L7']);
  });

  it('저장된 게임이 있으면 생성 없이 이어서 한다', () => {
    const firstEmpty = easy.givens.findIndex((value) => value === 0);
    let state = createGame(easy);
    state = gameReducer(state, { type: 'select', index: firstEmpty });
    state = gameReducer(state, { type: 'input', digit: 9 });
    saveGame(toSavedGame('easy', state));

    renderWithI18n(<App />);
    expect(requests).toHaveLength(0);
    expect(cells()[firstEmpty]!.textContent).toBe('9');
  });

  it('입력하면 진행 상황을 저장한다', async () => {
    const user = userEvent.setup();
    renderWithI18n(<App />);
    await resolveLast(easy);
    const firstEmpty = easy.givens.findIndex((value) => value === 0);
    await user.click(cells()[firstEmpty]!);
    await user.keyboard('7');
    expect(savedJson().values[firstEmpty]).toBe(7);
  });

  it('새 게임 메뉴에서 난이도를 골라야 새 퍼즐을 시작한다', async () => {
    const user = userEvent.setup();
    renderWithI18n(<App />);
    await resolveLast(easy);

    const toggle = screen.getByRole('button', { name: 'New game' });
    await user.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    // 현재 난이도에 포커스가 간다.
    expect(document.activeElement?.textContent).toContain('Easy');

    await user.click(screen.getByRole('button', { name: 'Hard' }));
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(requests.map((r) => r.level)).toEqual(['L2', 'L5']);
    expect(screen.getByRole('status').textContent).toContain('Hard');
    expect(localStorage.getItem(DIFFICULTY_KEY)).toBe('hard');
    // 새 퍼즐을 만드는 동안 이전 게임의 저장은 지운다.
    expect(localStorage.getItem(SAVE_KEY)).toBeNull();

    await resolveLast(asLevel('L5', 31337));
    expect(screen.getByText('Hard · Seed 31337')).toBeTruthy();
    expect(savedJson().difficulty).toBe('hard');
  });

  it('메뉴는 Esc나 취소로 닫고, 닫으면 새 게임 버튼으로 포커스를 돌려준다', async () => {
    const user = userEvent.setup();
    renderWithI18n(<App />);
    await resolveLast(easy);
    const toggle = screen.getByRole('button', { name: 'New game' });

    await user.click(toggle);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('button', { name: 'Hard' })).toBeNull();
    expect(document.activeElement).toBe(toggle);

    await user.click(toggle);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('button', { name: 'Hard' })).toBeNull();
    expect(requests).toHaveLength(1);
  });

  it('메뉴 안에서 누른 숫자 키는 보드에 입력하지 않는다', async () => {
    const user = userEvent.setup();
    renderWithI18n(<App />);
    await resolveLast(easy);
    const firstEmpty = easy.givens.findIndex((value) => value === 0);
    await user.click(cells()[firstEmpty]!);
    await user.click(screen.getByRole('button', { name: 'New game' }));
    await user.keyboard('5');
    expect(cells()[firstEmpty]!.textContent).toBe('');
  });

  it('새 게임을 연달아 요청하면 마지막 요청만 반영한다', async () => {
    const user = userEvent.setup();
    renderWithI18n(<App />);
    await resolveLast(easy);
    await user.click(screen.getByRole('button', { name: 'New game' }));
    await user.click(screen.getByRole('button', { name: 'Hard' }));
    await user.click(screen.getByRole('button', { name: 'New game' }));
    await user.click(screen.getByRole('button', { name: 'Master' }));

    const [, hard, master] = requests;
    await act(async () => master!.resolve(asLevel('L9', 1010)));
    await act(async () => hard!.resolve(asLevel('L5', 606))); // 늦게 끝난 이전 요청
    expect(screen.getByText('Master · Seed 1010')).toBeTruthy();
  });

  it('생성에 실패하면 안내와 다시 시도 버튼을 보여 준다', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const user = userEvent.setup();
    renderWithI18n(<App />);
    await act(async () => requests[0]!.reject(new Error('boom')));
    expect(screen.getByRole('status').textContent).toContain('Could not create a puzzle');

    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(requests.map((r) => r.level)).toEqual(['L2', 'L2']);
    await resolveLast(easy);
    expect(cells()).toHaveLength(81);
  });

  it('완성하면 저장을 지운다', async () => {
    renderWithI18n(<App />);
    await resolveLast(easy);
    easy.givens.forEach((value, index) => {
      if (value !== 0) return;
      fireEvent.click(cells()[index]!);
      fireEvent.keyDown(window, { key: String(easy.solution[index]) });
    });
    expect(screen.getByText('Solved! Well done.')).toBeTruthy();
    expect(localStorage.getItem(SAVE_KEY)).toBeNull();
  });

  it('도움말을 열고 닫으며, 닫으면 도움말 버튼으로 포커스를 돌려준다', async () => {
    const user = userEvent.setup();
    renderWithI18n(<App />);
    await resolveLast(easy);

    const help = screen.getByRole('button', { name: 'How to play' });
    expect(help.getAttribute('aria-haspopup')).toBe('dialog');
    await user.click(help);
    const dialog = screen.getByRole('dialog', { name: 'Guide' }) as HTMLDialogElement;
    expect(dialog.open).toBe(true);
    expect(within(dialog).getByText(/exactly once/)).toBeTruthy();
    expect(within(dialog).getByText('Ctrl/⌘ + Z')).toBeTruthy();
    // 열면 닫기 버튼에 포커스가 간다.
    expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: 'Close' }));

    await user.click(within(dialog).getByRole('button', { name: 'Close' }));
    expect(dialog.open).toBe(false);
    expect(document.activeElement).toBe(help);
  });

  it('도움말이 열려 있는 동안 누른 숫자 키는 보드에 입력하지 않는다', async () => {
    const user = userEvent.setup();
    renderWithI18n(<App />);
    await resolveLast(easy);
    const firstEmpty = easy.givens.findIndex((value) => value === 0);
    await user.click(cells()[firstEmpty]!);
    await user.click(screen.getByRole('button', { name: 'How to play' }));
    await user.keyboard('5');
    expect(cells()[firstEmpty]!.textContent).toBe('');
  });

  // 실제 Esc 키 동작은 Chrome(CDP)에서 확인했다. 여기서는 close 이벤트 경로만 검증한다.
  it('대화상자가 버튼 밖의 방법으로 닫혀도(close 이벤트) 상태를 닫힘으로 맞춘다', async () => {
    const user = userEvent.setup();
    renderWithI18n(<App />);
    await resolveLast(easy);
    const help = screen.getByRole('button', { name: 'How to play' });
    await user.click(help);
    const dialog = screen.getByRole('dialog') as HTMLDialogElement;
    act(() => dialog.close());
    expect(document.activeElement).toBe(help);
    // 다시 열 수 있어야 한다. (상태가 열림으로 남아 있으면 버튼을 눌러도 열리지 않는다)
    await user.click(help);
    expect(dialog.open).toBe(true);
  });

  it('후보 보기 설정을 기억해 새 게임에도 적용한다', async () => {
    const user = userEvent.setup();
    renderWithI18n(<App />);
    await resolveLast(easy);
    await user.click(screen.getByRole('button', { name: /Candidates/ }));
    expect(localStorage.getItem('sudoum.showCandidates')).toBe('true');

    await user.click(screen.getByRole('button', { name: 'New game' }));
    await user.click(screen.getByRole('button', { name: /^Easy/ }));
    await resolveLast(asLevel('L2', 777));
    expect(screen.getByRole('button', { name: /Candidates/ }).getAttribute('aria-pressed')).toBe('true');
  });

  describe('힌트 (실제 계산)', () => {
    /** 보통(힌트 1회)으로 시작한다. 퍼즐은 쉬운 퍼즐에 레벨만 바꿔 쓴다. */
    async function startMedium() {
      localStorage.setItem(DIFFICULTY_KEY, 'medium');
      renderWithI18n(<App />);
      expect(requests.map((r) => r.level)).toEqual(['L3']);
      await resolveLast(asLevel('L3', 4242));
      return screen.getByRole('button', { name: 'Hint 1' }) as HTMLButtonElement;
    }

    it('쉬움은 힌트가 0회라 버튼이 비활성이다', async () => {
      renderWithI18n(<App />);
      await resolveLast(easy);
      expect((screen.getByRole('button', { name: 'Hint 0' }) as HTMLButtonElement).disabled).toBe(true);
    });

    it('힌트를 보여 주면 1회를 쓰고, 적용하면 정답을 채우며 숫자 패드로 돌아온다', async () => {
      const user = userEvent.setup();
      const button = await startMedium();
      await user.click(button);

      const panel = await screen.findByRole('region', { name: /Single|Pointing|Pair/ });
      expect(within(panel).getByRole('button', { name: 'Apply' })).toBeTruthy();
      expect(document.activeElement?.textContent).toBe('Apply');
      expect(screen.queryByRole('button', { name: 'Enter 1' })).toBeNull(); // 숫자 패드 대신 힌트
      expect((screen.getByRole('button', { name: 'Hint 0' }) as HTMLButtonElement).disabled).toBe(true);
      expect(savedJson().hintsLeft).toBe(0);

      const focus = cells().findIndex((cell) => cell.hasAttribute('data-hint-focus'));
      expect(focus).toBeGreaterThanOrEqual(0);
      expect(cells()[focus]!.getAttribute('aria-label')).toMatch(/, hint$/);

      await user.click(within(panel).getByRole('button', { name: 'Apply' }));
      expect(screen.queryByRole('region')).toBeNull();
      expect(screen.getByRole('button', { name: 'Enter 1' })).toBeTruthy();
      expect(cells()[focus]!.textContent).toBe(String(easy.solution[focus]));
      // 적용하면 바뀐 칸으로 포커스가 간다.
      expect(document.activeElement).toBe(cells()[focus]);
    });

    it('틀린 숫자가 있으면 다음 수보다 먼저 그 칸을 알려 주고, 적용하면 지운다', async () => {
      const user = userEvent.setup();
      const button = await startMedium();
      const firstEmpty = easy.givens.findIndex((value) => value === 0);
      const wrong = (easy.solution[firstEmpty]! % 9) + 1;
      await user.click(cells()[firstEmpty]!);
      await user.keyboard(String(wrong));
      await user.click(button);

      const panel = screen.getByRole('region', { name: 'Wrong number' });
      expect(panel.textContent).toContain(`The ${wrong} in`);
      expect(cells()[firstEmpty]!.hasAttribute('data-hint-wrong')).toBe(true);
      await user.click(within(panel).getByRole('button', { name: 'Apply' }));
      expect(cells()[firstEmpty]!.textContent).toBe('');
    });

    it('Esc로 닫고, 남은 힌트가 없어 버튼이 비활성이면 보드 칸으로 포커스를 옮긴다 (횟수는 이미 썼다)', async () => {
      const user = userEvent.setup();
      const button = await startMedium();
      await user.click(button);
      await screen.findByRole('region');
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('region')).toBeNull();
      expect((screen.getByRole('button', { name: 'Hint 0' }) as HTMLButtonElement).disabled).toBe(true);
      expect(document.activeElement?.getAttribute('role')).toBe('gridcell');
    });

    it('힌트와 새 게임 메뉴가 함께 열려 있으면 Esc 한 번에 메뉴만 닫고 메뉴 버튼으로 포커스를 돌려준다', async () => {
      const user = userEvent.setup();
      const button = await startMedium();
      await user.click(button);
      await screen.findByRole('region');
      const toggle = screen.getByRole('button', { name: 'New game' });
      await user.click(toggle);
      expect(toggle.getAttribute('aria-expanded')).toBe('true');

      await user.keyboard('{Escape}');
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
      expect(screen.getByRole('region')).toBeTruthy(); // 힌트는 그대로
      expect(document.activeElement).toBe(toggle);

      // 한 번 더 누르면 이제 힌트를 닫는다.
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('region')).toBeNull();
    });

    it('메뉴가 열린 채 도움말을 열면, 대화상자 안의 Esc는 메뉴가 가로채지 않는다', async () => {
      const user = userEvent.setup();
      await startMedium();
      const toggle = screen.getByRole('button', { name: 'New game' });
      await user.click(toggle);
      await user.click(screen.getByRole('button', { name: 'How to play' }));
      const dialog = screen.getByRole('dialog') as HTMLDialogElement;

      const esc = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
      act(() => {
        within(dialog).getByRole('button', { name: 'Close' }).dispatchEvent(esc);
      });
      // 메뉴가 preventDefault()하면 브라우저가 대화상자를 닫지 못한다.
      expect(esc.defaultPrevented).toBe(false);
      expect(toggle.getAttribute('aria-expanded')).toBe('true');
    });

    it('힌트의 "이 기법 배우기"는 도움말을 그 기법 설명으로 열고, 닫으면 그 버튼으로 포커스를 돌려준다', async () => {
      const user = userEvent.setup();
      const button = await startMedium();
      await user.click(button);
      const panel = await screen.findByRole('region');
      const title = within(panel).getByRole('heading').textContent!;
      const learn = within(panel).getByRole('button', { name: 'Learn this technique' });
      await user.click(learn);

      const dialog = screen.getByRole('dialog', { name: 'Guide' }) as HTMLDialogElement;
      expect(dialog.open).toBe(true);
      const selectedTab = within(dialog).getAllByRole('tab').find((t) => t.getAttribute('aria-selected') === 'true')!;
      expect(['Basic solving', 'Advanced solving']).toContain(selectedTab.textContent);
      const chip = dialog.querySelector('.lesson-chips [aria-pressed="true"]')!;
      expect(chip.textContent).toBe(title); // 힌트의 기법 이름과 같은 설명
      expect(within(dialog).getByRole('tabpanel').querySelector('h3')!.textContent).toBe(title);

      await user.click(within(dialog).getByRole('button', { name: 'Close' }));
      expect(document.activeElement).toBe(learn);
      expect(screen.getByRole('region')).toBeTruthy(); // 힌트는 그대로
    });

    it('도움말 버튼으로 열면 플레이 방법 탭부터 보여 준다', async () => {
      const user = userEvent.setup();
      const button = await startMedium();
      await user.click(button);
      await user.click(within(await screen.findByRole('region')).getByRole('button', { name: 'Learn this technique' }));
      await user.click(within(screen.getByRole('dialog', { name: 'Guide' })).getByRole('button', { name: 'Close' }));
      await user.click(screen.getByRole('button', { name: 'How to play' }));
      const dialog = screen.getByRole('dialog', { name: 'Guide' });
      const selectedTab = within(dialog).getAllByRole('tab').find((t) => t.getAttribute('aria-selected') === 'true')!;
      expect(selectedTab.textContent).toBe('How to play');
    });

    it('힌트를 보는 중에 보드를 바꾸면 힌트를 닫는다', async () => {
      const user = userEvent.setup();
      const button = await startMedium();
      await user.click(button);
      await screen.findByRole('region');
      const other = easy.givens.findIndex((value, index) => value === 0 && !cells()[index]!.hasAttribute('data-hint-focus'));
      await user.click(cells()[other]!);
      await user.keyboard(String(easy.solution[other]));
      expect(screen.queryByRole('region')).toBeNull();
    });
  });
});
