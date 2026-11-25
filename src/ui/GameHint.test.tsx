// @vitest-environment happy-dom
import { act, cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HintView } from '../engine/hintTypes';
import { createPuzzle } from '../engine/puzzle';
import { createGame } from '../game/state';
import { renderWithI18n } from '../test/render';
import { Game } from './Game';

// 힌트 계산 결과를 테스트가 직접 정한다.
type Deferred = { resolve: (h: HintView | null) => void; reject: (e: Error) => void };
const pending: Deferred[] = [];
vi.mock('../workers/requestHint', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../workers/requestHint')>();
  return {
    ...actual,
    requestHint: vi.fn(() => new Promise<HintView | null>((resolve, reject) => pending.push({ resolve, reject }))),
  };
});

const puzzle = createPuzzle('L2', 4242);

function Harness({ hints }: { hints: number }) {
  const [slot, setSlot] = useState<HTMLDivElement | null>(null);
  return (
    <>
      <div ref={setSlot} />
      <Game initialState={createGame(puzzle, hints)} hintSlot={slot} />
    </>
  );
}

const hintButton = () => screen.getByRole('button', { name: /^Hint \d$/ }) as HTMLButtonElement;
const cells = () => screen.getAllByRole('gridcell');

beforeEach(() => {
  pending.length = 0;
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Game 힌트 (계산 결과 제어)', () => {
  it('계산하는 동안 안내를 보여 주고 버튼을 막는다', async () => {
    const user = userEvent.setup();
    renderWithI18n(<Harness hints={2} />);
    await user.click(hintButton());
    expect(screen.getByRole('region').textContent).toContain('Finding a hint');
    expect(hintButton().disabled).toBe(true);
    expect(hintButton().textContent).toBe('Hint 2'); // 아직 쓰지 않았다
  });

  it('적용할 힌트가 없으면 안내만 하고 횟수를 쓰지 않는다', async () => {
    const user = userEvent.setup();
    renderWithI18n(<Harness hints={2} />);
    await user.click(hintButton());
    await act(async () => pending[0]!.resolve(null));
    expect(screen.getByRole('region').textContent).toContain('No hint is available');
    expect(hintButton().textContent).toBe('Hint 2');
    expect(within(screen.getByRole('region')).queryByRole('button', { name: 'Apply' })).toBeNull();
  });

  it('계산에 실패하면 안내하고 횟수를 쓰지 않는다', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const user = userEvent.setup();
    renderWithI18n(<Harness hints={1} />);
    await user.click(hintButton());
    await act(async () => pending[0]!.reject(new Error('boom')));
    expect(screen.getByRole('region').textContent).toContain('Could not find a hint');
    expect(hintButton().textContent).toBe('Hint 1');
  });

  it('계산하는 동안 보드가 바뀌면 늦게 온 결과는 버린다', async () => {
    const user = userEvent.setup();
    renderWithI18n(<Harness hints={1} />);
    await user.click(hintButton());
    const firstEmpty = puzzle.givens.findIndex((v) => v === 0);
    await user.click(cells()[firstEmpty]!);
    await user.keyboard(String(puzzle.solution[firstEmpty]));
    await act(async () =>
      pending[0]!.resolve({ kind: 'missingNote', cell: firstEmpty, digit: 1 }),
    );
    expect(screen.queryByRole('region')).toBeNull();
    expect(hintButton().textContent).toBe('Hint 1');
  });

  it('후보 지우기 힌트는 메모가 없던 칸에 후보를 흐리게 보여 주고 지울 후보를 표시한다', async () => {
    const user = userEvent.setup();
    renderWithI18n(<Harness hints={1} />);
    const cell = puzzle.givens.findIndex((v) => v === 0);
    const candidates = Array<number>(81).fill(0);
    candidates[cell] = (1 << 3) | (1 << 7);
    await user.click(hintButton());
    await act(async () =>
      pending[0]!.resolve({
        kind: 'technique',
        tactic: 'yWing',
        action: 'eliminate',
        digit: 7,
        focusCell: cell,
        regionCells: [],
        patternCells: [],
        patternDigits: [7],
        placements: [],
        eliminations: [{ index: cell, digit: 7 }],
        candidates,
      }),
    );
    const notes = cells()[cell]!.querySelector('.notes')!;
    expect(notes.hasAttribute('data-preview')).toBe(true);
    expect(notes.querySelector('[data-eliminate]')!.textContent).toBe('7');
    expect(screen.getByRole('region').textContent).toContain('Remove: 7 in');

    await user.click(screen.getByRole('button', { name: 'Apply' }));
    // 적용하면 후보 3만 메모로 남는다.
    expect(cells()[cell]!.getAttribute('aria-label')).toMatch(/notes 3$/);
  });

  it('닫기 버튼으로 닫으면, 힌트가 남아 있을 때는 힌트 버튼으로 포커스를 돌려준다', async () => {
    const user = userEvent.setup();
    renderWithI18n(<Harness hints={2} />);
    await user.click(hintButton());
    await act(async () => pending[0]!.resolve({ kind: 'missingNote', cell: puzzle.givens.indexOf(0), digit: 1 }));
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('region')).toBeNull();
    expect(document.activeElement).toBe(hintButton());
    expect(hintButton().textContent).toBe('Hint 1');
  });
});
