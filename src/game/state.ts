import { colOf, indexOf, isSolved, peersOf, rowOf } from '../engine/grid';
import { CELL_COUNT, type Puzzle } from '../engine/types';

/** 칸별 메모. 숫자 d의 메모는 비트 (1 << d)로 표시한다. 0이면 메모 없음. */
export type NoteMask = number;

export type GameStatus = 'playing' | 'solved';

/** 실행 취소·다시 하기용 보드 기록. index는 그 변경이 일어난 칸이다. */
export interface HistoryEntry {
  readonly values: readonly number[];
  readonly notes: readonly NoteMask[];
  readonly index: number;
}

/** 기록이 끝없이 늘지 않도록 실행 취소는 최근 500번까지만 기억한다. */
export const HISTORY_LIMIT = 500;

export interface GameState {
  readonly puzzle: Puzzle;
  /** 현재 보드. 0은 빈칸. 주어진 숫자 포함 */
  readonly values: readonly number[];
  readonly notes: readonly NoteMask[];
  readonly selected: number | null;
  readonly noteMode: boolean;
  readonly status: GameStatus;
  readonly past: readonly HistoryEntry[];
  readonly future: readonly HistoryEntry[];
}

export type GameAction =
  | { readonly type: 'select'; readonly index: number }
  | { readonly type: 'move'; readonly dRow: number; readonly dCol: number }
  | { readonly type: 'input'; readonly digit: number }
  | { readonly type: 'erase' }
  | { readonly type: 'toggleNoteMode' }
  | { readonly type: 'undo' }
  | { readonly type: 'redo' };

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

export const canUndo = (state: GameState): boolean => state.status === 'playing' && state.past.length > 0;
export const canRedo = (state: GameState): boolean => state.status === 'playing' && state.future.length > 0;

export function createGame(puzzle: Puzzle): GameState {
  return {
    puzzle,
    values: [...puzzle.givens],
    notes: Array<NoteMask>(CELL_COUNT).fill(0),
    selected: null,
    noteMode: false,
    status: 'playing',
    past: [],
    future: [],
  };
}

/** 저장해 둔 보드·메모로 게임을 다시 시작한다. 실행 취소 기록은 비어 있다. */
export function restoreGame(
  puzzle: Puzzle,
  values: readonly number[],
  notes: readonly NoteMask[],
): GameState {
  const status = isSolved(values, puzzle.solution) ? 'solved' : 'playing';
  return { ...createGame(puzzle), values: [...values], notes: [...notes], status };
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** 보드가 바뀐 경우에만 이전 보드를 기록하고, 다시 하기 기록은 버린다. */
function commit(state: GameState, index: number, values: readonly number[], notes: readonly NoteMask[]): GameState {
  const entry: HistoryEntry = { values: state.values, notes: state.notes, index };
  const past = [...state.past, entry].slice(-HISTORY_LIMIT);
  const status = isSolved(values, state.puzzle.solution) ? 'solved' : 'playing';
  return { ...state, values, notes, status, past, future: [] };
}

function inputDigit(state: GameState, index: number, digit: number): GameState {
  if (isGiven(state, index)) return state;

  if (state.noteMode) {
    // 메모는 빈칸에만 단다.
    if (state.values[index] !== 0) return state;
    const notes = [...state.notes];
    notes[index] = notes[index]! ^ noteBit(digit);
    return commit(state, index, state.values, notes);
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
  return commit(state, index, values, notes);
}

function erase(state: GameState, index: number): GameState {
  if (isGiven(state, index)) return state;
  if (state.values[index] === 0 && state.notes[index] === 0) return state;
  const values = [...state.values];
  const notes = [...state.notes];
  values[index] = 0;
  notes[index] = 0;
  return commit(state, index, values, notes);
}

/** 기록 하나를 꺼내 보드를 되돌리고, 현재 보드는 반대쪽 기록에 넣는다. 바뀐 칸을 선택한다. */
function travel(state: GameState, direction: 'undo' | 'redo'): GameState {
  const from = direction === 'undo' ? state.past : state.future;
  const entry = from[from.length - 1];
  if (!entry) return state;
  const current: HistoryEntry = { values: state.values, notes: state.notes, index: entry.index };
  const rest = from.slice(0, -1);
  return {
    ...state,
    values: entry.values,
    notes: entry.notes,
    selected: entry.index,
    past: direction === 'undo' ? rest : [...state.past, current],
    future: direction === 'undo' ? [...state.future, current] : rest,
  };
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

    // 완성한 뒤에는 보드를 되돌리지 않는다.
    case 'undo':
      return canUndo(state) ? travel(state, 'undo') : state;

    case 'redo':
      return canRedo(state) ? travel(state, 'redo') : state;
  }
}
