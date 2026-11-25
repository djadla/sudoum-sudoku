import { describe, expect, it } from 'vitest';
import { peersOf } from '../engine/grid';
import { createPuzzle } from '../engine/puzzle';
import {
  HISTORY_LIMIT,
  canRedo,
  canUndo,
  createGame,
  gameReducer,
  hasNote,
  noteDigits,
  type GameAction,
  type GameState,
} from './state';

const puzzle = createPuzzle('L1', 12345);
const firstEmpty = puzzle.givens.findIndex((value) => value === 0);
const firstGiven = puzzle.givens.findIndex((value) => value !== 0);
const answer = puzzle.solution[firstEmpty]!;
const wrong = (answer % 9) + 1;

function run(...actions: GameAction[]): GameState {
  return actions.reduce(gameReducer, createGame(puzzle));
}

describe('createGame', () => {
  it('주어진 숫자로 보드를 시작하고 메모·선택은 비어 있다', () => {
    const state = createGame(puzzle);
    expect(state.values).toEqual(puzzle.givens);
    expect(state.notes.every((mask) => mask === 0)).toBe(true);
    expect(state.selected).toBeNull();
    expect(state.noteMode).toBe(false);
    expect(state.status).toBe('playing');
  });
});

describe('선택과 이동', () => {
  it('선택이 없을 때 이동하면 첫 칸을 선택한다', () => {
    expect(run({ type: 'move', dRow: 0, dCol: 1 }).selected).toBe(0);
  });

  it('보드 밖으로는 나가지 않는다', () => {
    expect(run({ type: 'select', index: 0 }, { type: 'move', dRow: -1, dCol: -1 }).selected).toBe(0);
    expect(run({ type: 'select', index: 80 }, { type: 'move', dRow: 1, dCol: 1 }).selected).toBe(80);
  });

  it('방향대로 움직인다', () => {
    expect(run({ type: 'select', index: 40 }, { type: 'move', dRow: 1, dCol: 0 }).selected).toBe(49);
    expect(run({ type: 'select', index: 40 }, { type: 'move', dRow: 0, dCol: -1 }).selected).toBe(39);
  });

  it('범위 밖 칸은 선택하지 않는다', () => {
    expect(run({ type: 'select', index: 81 }).selected).toBeNull();
  });
});

describe('숫자 입력', () => {
  it('선택한 빈칸에 숫자를 넣는다', () => {
    const state = run({ type: 'select', index: firstEmpty }, { type: 'input', digit: wrong });
    expect(state.values[firstEmpty]).toBe(wrong);
  });

  it('같은 숫자를 다시 넣으면 지운다', () => {
    const state = run(
      { type: 'select', index: firstEmpty },
      { type: 'input', digit: wrong },
      { type: 'input', digit: wrong },
    );
    expect(state.values[firstEmpty]).toBe(0);
  });

  it('주어진 숫자 칸은 바꾸지 않는다', () => {
    const state = run({ type: 'select', index: firstGiven }, { type: 'input', digit: 1 }, { type: 'erase' });
    expect(state.values[firstGiven]).toBe(puzzle.givens[firstGiven]);
  });

  it('선택이 없으면 아무것도 바꾸지 않는다', () => {
    const before = createGame(puzzle);
    expect(gameReducer(before, { type: 'input', digit: 1 })).toBe(before);
  });

  it('1~9 밖의 값은 무시한다', () => {
    const state = run({ type: 'select', index: firstEmpty }, { type: 'input', digit: 0 });
    expect(state.values[firstEmpty]).toBe(0);
  });
});

describe('메모', () => {
  it('메모 모드에서는 빈칸의 메모를 켜고 끈다', () => {
    const on = run(
      { type: 'select', index: firstEmpty },
      { type: 'toggleNoteMode' },
      { type: 'input', digit: 2 },
      { type: 'input', digit: 7 },
    );
    expect(noteDigits(on.notes[firstEmpty]!)).toEqual([2, 7]);
    expect(on.values[firstEmpty]).toBe(0);

    const off = gameReducer(on, { type: 'input', digit: 2 });
    expect(noteDigits(off.notes[firstEmpty]!)).toEqual([7]);
  });

  it('숫자가 있는 칸에는 메모를 달지 않는다', () => {
    const state = run(
      { type: 'select', index: firstEmpty },
      { type: 'input', digit: wrong },
      { type: 'toggleNoteMode' },
      { type: 'input', digit: 3 },
    );
    expect(state.notes[firstEmpty]).toBe(0);
  });

  it('숫자를 넣으면 그 칸의 메모와 이웃 칸의 같은 숫자 메모를 지운다', () => {
    const peer = peersOf(firstEmpty).find((index) => puzzle.givens[index] === 0)!;
    const state = run(
      { type: 'toggleNoteMode' },
      { type: 'select', index: peer },
      { type: 'input', digit: answer },
      { type: 'input', digit: 1 === answer ? 2 : 1 },
      { type: 'select', index: firstEmpty },
      { type: 'input', digit: 5 },
      { type: 'toggleNoteMode' },
      { type: 'input', digit: answer },
    );
    expect(state.notes[firstEmpty]).toBe(0);
    expect(hasNote(state.notes[peer]!, answer)).toBe(false);
    expect(hasNote(state.notes[peer]!, 1 === answer ? 2 : 1)).toBe(true);
  });
});

describe('지우기', () => {
  it('입력한 숫자와 메모를 지운다', () => {
    const state = run(
      { type: 'select', index: firstEmpty },
      { type: 'input', digit: wrong },
      { type: 'erase' },
    );
    expect(state.values[firstEmpty]).toBe(0);

    const noted = run(
      { type: 'select', index: firstEmpty },
      { type: 'toggleNoteMode' },
      { type: 'input', digit: 4 },
      { type: 'erase' },
    );
    expect(noted.notes[firstEmpty]).toBe(0);
  });
});

describe('완성 판정', () => {
  function solveAll(): GameState {
    const actions: GameAction[] = [];
    puzzle.givens.forEach((value, index) => {
      if (value === 0) actions.push({ type: 'select', index }, { type: 'input', digit: puzzle.solution[index]! });
    });
    return run(...actions);
  }

  it('모든 빈칸을 정답으로 채우면 완성 상태가 된다', () => {
    const state = solveAll();
    expect(state.values).toEqual(puzzle.solution);
    expect(state.status).toBe('solved');
  });

  it('한 칸이라도 틀리면 완성이 아니다', () => {
    const actions: GameAction[] = [];
    puzzle.givens.forEach((value, index) => {
      if (value === 0) {
        const digit = index === firstEmpty ? wrong : puzzle.solution[index]!;
        actions.push({ type: 'select', index }, { type: 'input', digit });
      }
    });
    expect(run(...actions).status).toBe('playing');
  });

  it('완성한 뒤에는 보드를 바꾸지 않는다', () => {
    const solved = solveAll();
    const afterInput = gameReducer(gameReducer(solved, { type: 'select', index: firstEmpty }), {
      type: 'erase',
    });
    expect(afterInput.values).toEqual(puzzle.solution);
  });
});

describe('실행 취소·다시 하기', () => {
  const second = puzzle.givens.findIndex((value, index) => value === 0 && index > firstEmpty);

  it('입력을 되돌리고 다시 적용하며, 바뀐 칸을 선택한다', () => {
    const typed = run(
      { type: 'select', index: firstEmpty },
      { type: 'input', digit: wrong },
      { type: 'select', index: second },
    );
    const undone = gameReducer(typed, { type: 'undo' });
    expect(undone.values[firstEmpty]).toBe(0);
    expect(undone.selected).toBe(firstEmpty);
    expect(canUndo(undone)).toBe(false);
    expect(canRedo(undone)).toBe(true);

    const redone = gameReducer(undone, { type: 'redo' });
    expect(redone.values[firstEmpty]).toBe(wrong);
    expect(canRedo(redone)).toBe(false);
  });

  it('메모 변경과 지우기도 되돌린다', () => {
    const state = run(
      { type: 'select', index: firstEmpty },
      { type: 'toggleNoteMode' },
      { type: 'input', digit: 4 },
      { type: 'erase' },
      { type: 'undo' },
    );
    expect(noteDigits(state.notes[firstEmpty]!)).toEqual([4]);
    expect(noteDigits(gameReducer(state, { type: 'undo' }).notes[firstEmpty]!)).toEqual([]);
  });

  it('이웃 메모 자동 제거도 한 번에 되돌린다', () => {
    const peer = peersOf(firstEmpty).find((index) => puzzle.givens[index] === 0)!;
    const noted = run(
      { type: 'toggleNoteMode' },
      { type: 'select', index: peer },
      { type: 'input', digit: answer },
      { type: 'toggleNoteMode' },
      { type: 'select', index: firstEmpty },
      { type: 'input', digit: answer },
    );
    expect(hasNote(noted.notes[peer]!, answer)).toBe(false);
    expect(hasNote(gameReducer(noted, { type: 'undo' }).notes[peer]!, answer)).toBe(true);
  });

  it('새로 입력하면 다시 하기 기록을 버린다', () => {
    const state = run(
      { type: 'select', index: firstEmpty },
      { type: 'input', digit: wrong },
      { type: 'undo' },
      { type: 'select', index: second },
      { type: 'input', digit: 1 },
    );
    expect(canRedo(state)).toBe(false);
  });

  it('보드가 바뀌지 않은 동작은 기록하지 않는다', () => {
    const state = run(
      { type: 'select', index: firstGiven },
      { type: 'input', digit: 1 },
      { type: 'erase' },
      { type: 'select', index: firstEmpty },
      { type: 'erase' },
      { type: 'move', dRow: 1, dCol: 0 },
      { type: 'toggleNoteMode' },
    );
    expect(state.past).toHaveLength(0);
  });

  it('기록이 없으면 아무것도 하지 않는다', () => {
    const state = createGame(puzzle);
    expect(gameReducer(state, { type: 'undo' })).toBe(state);
    expect(gameReducer(state, { type: 'redo' })).toBe(state);
  });

  it(`기록은 최근 ${HISTORY_LIMIT}번까지만 남긴다`, () => {
    let state = run({ type: 'select', index: firstEmpty }, { type: 'toggleNoteMode' });
    for (let i = 0; i < HISTORY_LIMIT + 10; i++) state = gameReducer(state, { type: 'input', digit: 1 });
    expect(state.past).toHaveLength(HISTORY_LIMIT);
  });

  it('완성한 뒤에는 되돌리지 않는다', () => {
    const actions: GameAction[] = [];
    puzzle.givens.forEach((value, index) => {
      if (value === 0) actions.push({ type: 'select', index }, { type: 'input', digit: puzzle.solution[index]! });
    });
    const solved = run(...actions);
    expect(canUndo(solved)).toBe(false);
    expect(gameReducer(solved, { type: 'undo' })).toBe(solved);
  });
});
