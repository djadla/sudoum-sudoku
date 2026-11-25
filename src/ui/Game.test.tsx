// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPuzzle } from '../engine/puzzle';
import { renderWithI18n } from '../test/render';
import { Game, keyToAction } from './Game';

const puzzle = createPuzzle('L1', 12345);
const firstEmpty = puzzle.givens.findIndex((value) => value === 0);
const firstGiven = puzzle.givens.findIndex((value) => value !== 0);
const answer = puzzle.solution[firstEmpty]!;
const wrong = (answer % 9) + 1;

function setup() {
  const onNewPuzzle = vi.fn();
  const user = userEvent.setup();
  renderWithI18n(<Game puzzle={puzzle} onNewPuzzle={onNewPuzzle} />);
  const cells = within(screen.getByRole('grid')).getAllByRole('gridcell');
  return { user, cells, onNewPuzzle };
}

afterEach(cleanup);

describe('keyToAction', () => {
  it.each([
    ['5', { type: 'input', digit: 5 }],
    ['0', { type: 'erase' }],
    ['Backspace', { type: 'erase' }],
    ['Delete', { type: 'erase' }],
    ['n', { type: 'toggleNoteMode' }],
    ['N', { type: 'toggleNoteMode' }],
    ['ArrowUp', { type: 'move', dRow: -1, dCol: 0 }],
    ['ArrowRight', { type: 'move', dRow: 0, dCol: 1 }],
    ['a', null],
    ['Enter', null],
  ])('%s', (key, expected) => {
    expect(keyToAction(key)).toEqual(expected);
  });
});

describe('Game', () => {
  it('81칸 보드와 주어진 숫자를 그린다', () => {
    const { cells } = setup();
    expect(cells).toHaveLength(81);
    expect(cells[firstGiven]!.textContent).toBe(String(puzzle.givens[firstGiven]));
    expect(cells[firstGiven]!.getAttribute('aria-label')).toContain('given');
  });

  it('칸을 누르면 선택되고, 같은 행·열·박스가 강조된다', async () => {
    const { user, cells } = setup();
    await user.click(cells[40]!);
    expect(cells[40]!.getAttribute('aria-selected')).toBe('true');
    expect(cells[40]!.hasAttribute('data-selected')).toBe(true);
    expect(cells[36]!.hasAttribute('data-peer')).toBe(true); // 같은 행
    expect(cells[4]!.hasAttribute('data-peer')).toBe(true); // 같은 열
    expect(cells[30]!.hasAttribute('data-peer')).toBe(true); // 같은 박스
    expect(cells[0]!.hasAttribute('data-peer')).toBe(false);
  });

  it('같은 숫자가 있는 칸을 강조한다', async () => {
    const { user, cells } = setup();
    await user.click(cells[firstGiven]!);
    const digit = puzzle.givens[firstGiven]!;
    const same = puzzle.givens.flatMap((value, index) => (value === digit && index !== firstGiven ? [index] : []));
    expect(same.length).toBeGreaterThan(0);
    for (const index of same) expect(cells[index]!.hasAttribute('data-same')).toBe(true);
  });

  it('키보드로 숫자를 넣고 지운다', async () => {
    const { user, cells } = setup();
    await user.click(cells[firstEmpty]!);
    await user.keyboard(String(wrong));
    expect(cells[firstEmpty]!.textContent).toBe(String(wrong));
    await user.keyboard('{Backspace}');
    expect(cells[firstEmpty]!.textContent).toBe('');
  });

  it('숫자 패드와 지우기 버튼으로 입력한다', async () => {
    const { user, cells } = setup();
    await user.click(cells[firstEmpty]!);
    await user.click(screen.getByRole('button', { name: `Enter ${wrong}` }));
    expect(cells[firstEmpty]!.textContent).toBe(String(wrong));
    await user.click(screen.getByRole('button', { name: 'Erase' }));
    expect(cells[firstEmpty]!.textContent).toBe('');
  });

  it('주어진 숫자 칸은 바꿀 수 없다', async () => {
    const { user, cells } = setup();
    await user.click(cells[firstGiven]!);
    await user.keyboard('{Backspace}');
    expect(cells[firstGiven]!.textContent).toBe(String(puzzle.givens[firstGiven]));
  });

  it('메모 모드에서 메모를 켜고 끈다', async () => {
    const { user, cells } = setup();
    const toggle = screen.getByRole('button', { name: /Notes/ });
    expect(toggle.getAttribute('aria-pressed')).toBe('false');

    await user.click(cells[firstEmpty]!);
    await user.keyboard('n');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Toggle note 3' })).toBeTruthy();

    await user.keyboard('37');
    expect(cells[firstEmpty]!.getAttribute('aria-label')).toMatch(/notes 3, 7$/);
    await user.keyboard('3');
    expect(cells[firstEmpty]!.getAttribute('aria-label')).toMatch(/notes 7$/);
  });

  it('방향키로 선택을 옮기고 포커스도 따라간다', async () => {
    const { user, cells } = setup();
    await user.click(cells[40]!);
    await user.keyboard('{ArrowDown}{ArrowLeft}');
    expect(cells[48]!.getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(cells[48]);
  });

  it('선택한 칸만 Tab으로 들어올 수 있다 (roving tabindex)', async () => {
    const { user, cells } = setup();
    expect(cells.filter((cell) => cell.tabIndex === 0)).toEqual([cells[0]]);
    await user.click(cells[40]!);
    expect(cells.filter((cell) => cell.tabIndex === 0)).toEqual([cells[40]]);
  });

  it('언어 선택기 등 입력 요소에서 누른 키는 가로채지 않는다', () => {
    const { cells } = setup();
    fireEvent.click(cells[firstEmpty]!);
    const select = document.createElement('select');
    document.body.append(select);
    fireEvent.keyDown(select, { key: String(wrong) });
    expect(cells[firstEmpty]!.textContent).toBe('');
    select.remove();
  });

  it('모든 빈칸을 정답으로 채우면 완성 메시지를 보여 주고 입력을 막는다', () => {
    const { cells } = setup();
    puzzle.givens.forEach((value, index) => {
      if (value !== 0) return;
      fireEvent.click(cells[index]!);
      fireEvent.keyDown(window, { key: String(puzzle.solution[index]) });
    });
    expect(screen.getByRole('status').textContent).toContain('Solved');
    expect((screen.getByRole('button', { name: 'Erase' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('새 퍼즐 버튼은 부모에게 알린다', async () => {
    const { user, onNewPuzzle } = setup();
    await user.click(screen.getByRole('button', { name: 'New puzzle' }));
    expect(onNewPuzzle).toHaveBeenCalledOnce();
  });
});
