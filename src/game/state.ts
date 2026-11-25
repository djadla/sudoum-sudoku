import { colOf, indexOf, isSolved, peersOf, rowOf } from '../engine/grid';
import { CELL_COUNT, type Puzzle } from '../engine/puzzle';

/** 칸별 메모. 숫자 d의 메모는 비트 (1 << d)로 표시한다. 0이면 메모 없음. */
export type NoteMask = number;

export type GameStatus = 'playing' | 'solved';

export interface GameState {
  readonly puzzle: Puzzle;
  /** 현재 보드. 0은 빈칸. 주어진 숫자 포함 */
  readonly values: readonly number[];
  readonly notes: readonly NoteMask[];
  readonly selected: number | null;
  readonly noteMode: boolean;
  readonly status: GameStatus;
}

export type GameAction =
  | { readonly type: 'select'; readonly index: number }
  | { readonly type: 'move'; readonly dRow: number; readonly dCol: number }
  | { readonly type: 'input'; readonly digit: number }
  | { readonly type: 'erase' }
  | { readonly type: 'toggleNoteMode' };

export const noteBit = (digit: number): NoteMask => 1 << digit;

export function hasNote(mask: NoteMask, digit: number): boolean {
  return (mask & noteBit(digit)) !== 0;
}

export function noteDigits(mask: NoteMask): number[] {
  const digits: number[] = [];
  for (let digit = 1; digit <= 9; digit++) if (hasNote(mask, digit)) digits.push(digit);
  return digits;
}

export function isGiven(state: GameState, index: number): boolean {
  return state.puzzle.givens[index] !== 0;
}

export function createGame(puzzle: Puzzle): GameState {
  return {
    puzzle,
    values: [...puzzle.givens],
    notes: Array<NoteMask>(CELL_COUNT).fill(0),
    selected: null,
    noteMode: false,
    status: 'playing',
  };
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function inputDigit(state: GameState, index: number, digit: number): GameState {
  if (isGiven(state, index)) return state;

  if (state.noteMode) {
    // 메모는 빈칸에만 단다.
    if (state.values[index] !== 0) return state;
    const notes = [...state.notes];
    notes[index] = notes[index]! ^ noteBit(digit);
    return { ...state, notes };
  }

  // 같은 숫자를 다시 누르면 지운다.
  const next = state.values[index] === digit ? 0 : digit;
  const values = [...state.values];
  values[index] = next;

  const notes = [...state.notes];
  notes[index] = 0;
  if (next !== 0) {
    // 숫자를 넣으면 같은 행·열·박스의 같은 숫자 메모는 더 이상 가능하지 않으므로 지운다.
    for (const peer of peersOf(index)) notes[peer] = notes[peer]! & ~noteBit(digit);
  }

  const status = isSolved(values, state.puzzle.solution) ? 'solved' : 'playing';
  return { ...state, values, notes, status };
}

function erase(state: GameState, index: number): GameState {
  if (isGiven(state, index)) return state;
  if (state.values[index] === 0 && state.notes[index] === 0) return state;
  const values = [...state.values];
  const notes = [...state.notes];
  values[index] = 0;
  notes[index] = 0;
  return { ...state, values, notes };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'select':
      if (action.index < 0 || action.index >= CELL_COUNT || action.index === state.selected) return state;
      return { ...state, selected: action.index };

    case 'move': {
      if (state.selected === null) return { ...state, selected: 0 };
      const row = clamp(rowOf(state.selected) + action.dRow, 0, 8);
      const col = clamp(colOf(state.selected) + action.dCol, 0, 8);
      return { ...state, selected: indexOf(row, col) };
    }

    case 'toggleNoteMode':
      return { ...state, noteMode: !state.noteMode };

    case 'input':
      if (state.status === 'solved' || state.selected === null) return state;
      if (!Number.isInteger(action.digit) || action.digit < 1 || action.digit > 9) return state;
      return inputDigit(state, state.selected, action.digit);

    case 'erase':
      if (state.status === 'solved' || state.selected === null) return state;
      return erase(state, state.selected);
  }
}
