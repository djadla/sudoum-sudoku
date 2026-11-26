// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPuzzle } from '../engine/puzzle';
import { createGame } from '../game/state';
import { renderWithI18n } from '../test/render';
import { eventToAction, Game, keyToAction } from './Game';

const puzzle = createPuzzle('L1', 12345);
const firstEmpty = puzzle.givens.findIndex((value) => value === 0);
const firstGiven = puzzle.givens.findIndex((value) => value !== 0);
const answer = puzzle.solution[firstEmpty]!;
const wrong = (answer % 9) + 1;

function setup() {
  const onChange = vi.fn();
  const user = userEvent.setup();
  renderWithI18n(<Game initialState={createGame(puzzle)} onChange={onChange} />);
  const cells = within(screen.getByRole('grid')).getAllByRole('gridcell');
  return { user, cells, onChange };
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
    ['c', { type: 'toggleCandidates' }],
    ['C', { type: 'toggleCandidates' }],
    ['ArrowUp', { type: 'move', dRow: -1, dCol: 0 }],
    ['ArrowRight', { type: 'move', dRow: 0, dCol: 1 }],
    ['a', null],
    ['Enter', null],
  ])('%s', (key, expected) => {
    expect(keyToAction(key)).toEqual(expected);
  });
});

describe('eventToAction', () => {
  const key = (k: string, mods: Partial<Record<'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey', boolean>> = {}) => ({
    key: k,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    ...mods,
  });

  it.each([
    [key('z', { ctrlKey: true }), { type: 'undo' }],
    [key('z', { metaKey: true }), { type: 'undo' }],
    [key('Z', { metaKey: true, shiftKey: true }), { type: 'redo' }],
    [key('y', { ctrlKey: true }), { type: 'redo' }],
    [key('c', { ctrlKey: true }), null],
    [key('5', { ctrlKey: true }), null],
    [key('5', { altKey: true }), null],
    [key('5'), { type: 'input', digit: 5 }],
  ])('%o', (input, expected) => {
    expect(eventToAction(input)).toEqual(expected);
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

  it('보드가 바뀔 때만 onChange로 알린다', async () => {
    const { user, cells, onChange } = setup();
    expect(onChange).toHaveBeenCalledTimes(1); // 시작 상태
    await user.click(cells[firstEmpty]!); // 선택만 바뀜
    await user.keyboard('n'); // 메모 모드만 바뀜
    expect(onChange).toHaveBeenCalledTimes(1);
    await user.keyboard('5');
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange.mock.lastCall![0].notes[firstEmpty]).toBe(1 << 5);
  });

  it('같은 행에 같은 숫자를 넣으면 두 칸 모두 충돌로 표시하고, 지우면 해제한다', async () => {
    const { user, cells } = setup();
    // 첫 빈칸과 같은 행에 있는 주어진 숫자 하나를 골라 같은 숫자를 넣는다.
    const row = Math.floor(firstEmpty / 9);
    const givenInRow = puzzle.givens.findIndex((value, index) => value !== 0 && Math.floor(index / 9) === row);
    const digit = puzzle.givens[givenInRow]!;

    await user.click(cells[firstEmpty]!);
    await user.keyboard(String(digit));
    expect(cells[firstEmpty]!.hasAttribute('data-conflict')).toBe(true);
    expect(cells[givenInRow]!.hasAttribute('data-conflict')).toBe(true);
    expect(cells[firstEmpty]!.getAttribute('aria-label')).toMatch(/, duplicate$/);
    expect(cells[givenInRow]!.getAttribute('aria-label')).toMatch(/given, duplicate$/);

    await user.keyboard('{Backspace}');
    expect(cells[firstEmpty]!.hasAttribute('data-conflict')).toBe(false);
    expect(cells[givenInRow]!.hasAttribute('data-conflict')).toBe(false);
  });

  it('정답 숫자는 충돌로 표시하지 않는다', async () => {
    const { user, cells } = setup();
    await user.click(cells[firstEmpty]!);
    await user.keyboard(String(answer));
    expect(cells.some((cell) => cell.hasAttribute('data-conflict'))).toBe(false);
  });

  it('실행 취소·다시 하기 버튼과 단축키로 입력을 되돌린다', async () => {
    const { user, cells } = setup();
    const undo = screen.getByRole('button', { name: 'Undo' }) as HTMLButtonElement;
    const redo = screen.getByRole('button', { name: 'Redo' }) as HTMLButtonElement;
    expect(undo.disabled).toBe(true);
    expect(redo.disabled).toBe(true);

    await user.click(cells[firstEmpty]!);
    await user.keyboard(String(wrong));
    expect(undo.disabled).toBe(false);

    await user.click(undo);
    expect(cells[firstEmpty]!.textContent).toBe('');
    expect(redo.disabled).toBe(false);

    await user.click(redo);
    expect(cells[firstEmpty]!.textContent).toBe(String(wrong));

    await user.keyboard('{Control>}z{/Control}');
    expect(cells[firstEmpty]!.textContent).toBe('');
    await user.keyboard('{Meta>}{Shift>}z{/Shift}{/Meta}');
    expect(cells[firstEmpty]!.textContent).toBe(String(wrong));
  });

  it('후보 보기를 켜면 메모가 없는 빈칸에 후보를 흐리게 보여 주고, 숫자를 넣으면 다시 계산한다', async () => {
    const { user, cells } = setup();
    const toggle = screen.getByRole('button', { name: /Candidates/ });
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(cells[firstEmpty]!.querySelector('.notes')).toBeNull();

    await user.keyboard('c');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    const notes = cells[firstEmpty]!.querySelector('.notes')!;
    expect(notes.hasAttribute('data-auto')).toBe(true);
    expect(notes.textContent).toContain(String(answer));
    expect(cells[firstEmpty]!.getAttribute('aria-label')).toMatch(/candidates .*\d$/);

    // 같은 행의 다른 빈칸에 정답을 넣으면, 그 숫자는 이 칸의 후보에서 빠진다.
    const row = Math.floor(firstEmpty / 9);
    const other = puzzle.givens.findIndex((v, i) => v === 0 && i !== firstEmpty && Math.floor(i / 9) === row);
    if (other >= 0) {
      const digit = puzzle.solution[other]!;
      await user.click(cells[other]!);
      await user.keyboard(String(digit));
      expect(cells[firstEmpty]!.querySelector('.notes')!.textContent).not.toContain(String(digit));
    }
  });

  it('직접 적은 메모가 있는 칸은 후보 대신 메모를 보여 주고, 메모는 바뀌지 않는다', async () => {
    const { user, cells } = setup();
    await user.click(cells[firstEmpty]!);
    await user.keyboard('n4n'); // 메모 4
    await user.keyboard('c');
    const notes = cells[firstEmpty]!.querySelector('.notes')!;
    expect(notes.hasAttribute('data-auto')).toBe(false);
    expect(notes.textContent).toBe('4');
    expect(cells[firstEmpty]!.getAttribute('aria-label')).toMatch(/notes 4$/);
  });

  it('후보 버튼의 낭독 이름에 화면에 보이는 이름이 들어 있다 (WCAG 2.5.3)', () => {
    setup();
    const button = screen.getByRole('button', { name: /Cand/ });
    // happy-dom은 미디어 쿼리를 적용하지 않으므로, 두 이름이 모두 일반 텍스트로 접근 이름에 들어가는지 확인한다.
    // (좁은 화면에서는 CSS가 긴 이름을 display: none으로 빼서 접근 이름이 "Cands Off"가 된다)
    expect(button.querySelector('.label-narrow')!.getAttribute('aria-hidden')).toBeNull();
    expect(button.textContent).toContain('Cands');
  });
});
