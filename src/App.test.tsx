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
    expect(requests.map((r) => r.level)).toEqual(['L8']);
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
    expect(requests.map((r) => r.level)).toEqual(['L2', 'L6']);
    expect(screen.getByRole('status').textContent).toContain('Hard');
    expect(localStorage.getItem(DIFFICULTY_KEY)).toBe('hard');
    // 새 퍼즐을 만드는 동안 이전 게임의 저장은 지운다.
    expect(localStorage.getItem(SAVE_KEY)).toBeNull();

    await resolveLast(asLevel('L6', 31337));
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
    await act(async () => master!.resolve(asLevel('L10', 1010)));
    await act(async () => hard!.resolve(asLevel('L6', 606))); // 늦게 끝난 이전 요청
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
});
