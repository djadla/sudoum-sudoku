// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPuzzle } from '../engine/puzzle';
import {
  DIFFICULTY_KEY,
  SAVE_KEY,
  clearSavedGame,
  loadDifficulty,
  loadSavedGame,
  parseSavedGame,
  saveDifficulty,
  saveGame,
  toSavedGame,
  type SavedGame,
} from './persistence';
import { createGame, gameReducer, restoreGame } from './state';

const puzzle = createPuzzle('L2', 777);
const firstEmpty = puzzle.givens.findIndex((value) => value === 0);
const secondEmpty = puzzle.givens.findIndex((value, index) => value === 0 && index > firstEmpty);
const firstGiven = puzzle.givens.findIndex((value) => value !== 0);

function playedState() {
  let state = createGame(puzzle);
  state = gameReducer(state, { type: 'select', index: firstEmpty });
  state = gameReducer(state, { type: 'input', digit: puzzle.solution[firstEmpty]! });
  state = gameReducer(state, { type: 'select', index: secondEmpty });
  state = gameReducer(state, { type: 'toggleNoteMode' });
  state = gameReducer(state, { type: 'input', digit: 3 });
  return state;
}

/** JSON으로 저장했다가 읽은 것과 같은 값 */
const roundTrip = (saved: SavedGame): unknown => JSON.parse(JSON.stringify(saved));

/** 주어진 숫자가 없는 같은 행의 두 칸에서 서로 다른 정답 숫자를 맞바꾼다. 행 규칙은 유지되지만 열·박스 규칙이 깨진다. */
function swapEmptyInRow(solution: number[]): void {
  for (let row = 0; row < 9; row++) {
    const empties = Array.from({ length: 9 }, (_, col) => row * 9 + col).filter((i) => puzzle.givens[i] === 0);
    if (empties.length >= 2) {
      const [a, b] = empties as [number, number];
      [solution[a], solution[b]] = [solution[b]!, solution[a]!];
      return;
    }
  }
  throw new Error('빈칸이 두 개 이상인 행이 없습니다.');
}

function mutate(change: (raw: Record<string, any>) => void): unknown {
  const raw = roundTrip(toSavedGame('easy', playedState())) as Record<string, any>;
  change(raw);
  return raw;
}

beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

describe('parseSavedGame', () => {
  it('저장한 게임을 그대로 읽는다', () => {
    const state = playedState();
    const parsed = parseSavedGame(roundTrip(toSavedGame('easy', state)));
    expect(parsed).not.toBeNull();
    expect(parsed!.difficulty).toBe('easy');
    expect(parsed!.puzzle).toEqual(puzzle);
    expect(parsed!.values).toEqual(state.values);
    expect(parsed!.notes).toEqual(state.notes);
  });

  it('읽은 값으로 같은 보드를 복원하고 실행 취소 기록은 비운다', () => {
    const state = playedState();
    const parsed = parseSavedGame(roundTrip(toSavedGame('easy', state)))!;
    const restored = restoreGame(parsed.puzzle, parsed.values, parsed.notes);
    expect(restored.values).toEqual(state.values);
    expect(restored.notes).toEqual(state.notes);
    expect(restored.past).toEqual([]);
    expect(restored.status).toBe('playing');
  });

  it.each<[string, unknown]>([
    ['null', null],
    ['배열', []],
    ['모르는 버전', mutate((raw) => (raw.version = 3))],
    ['남은 힌트가 음수', mutate((raw) => (raw.hintsLeft = -1))],
    ['남은 힌트가 난이도 허용치보다 많음', mutate((raw) => (raw.hintsLeft = 1))],
    ['남은 힌트가 정수가 아님', mutate((raw) => (raw.hintsLeft = 0.5))],
    ['버전 2인데 남은 힌트가 없음', mutate((raw) => delete raw.hintsLeft)],
    ['모르는 난이도', mutate((raw) => (raw.difficulty = 'insane'))],
    ['난이도와 레벨이 맞지 않음', mutate((raw) => (raw.difficulty = 'hard'))],
    ['칸 수가 다름', mutate((raw) => raw.values.pop())],
    ['범위 밖 숫자', mutate((raw) => (raw.values[firstEmpty] = 10))],
    ['정수가 아님', mutate((raw) => (raw.values[firstEmpty] = 1.5))],
    ['주어진 숫자를 바꿈', mutate((raw) => (raw.values[firstGiven] = 0))],
    ['주어진 숫자가 정답과 다름', mutate((raw) => (raw.puzzle.solution[firstGiven] = (raw.puzzle.solution[firstGiven] % 9) + 1))],
    ['숫자가 있는 칸에 메모', mutate((raw) => (raw.notes[firstEmpty] = 1 << 4))],
    ['잘못된 메모 비트', mutate((raw) => (raw.notes[secondEmpty] = 1))],
    ['seed가 없음', mutate((raw) => delete raw.puzzle.seed)],
    // 주어진 숫자와는 맞지만 정답이 규칙을 어기는 경우 (빈칸 자리의 정답만 바꿈)
    ['정답에 같은 행 중복', mutate((raw) => (raw.puzzle.solution[secondEmpty] = (raw.puzzle.solution[secondEmpty] % 9) + 1))],
    ['정답의 같은 행 두 칸을 맞바꿈(열·박스 위반)', mutate((raw) => swapEmptyInRow(raw.puzzle.solution))],
  ])('잘못된 저장은 버린다: %s', (_, raw) => {
    expect(parseSavedGame(raw)).toBeNull();
  });
});

describe('저장 형식 버전', () => {
  it('남은 힌트 횟수를 저장하고 읽는다', () => {
    const hard = createPuzzle('L6', 31);
    const state = gameReducer(createGame(hard, 3), { type: 'useHint' });
    const parsed = parseSavedGame(roundTrip(toSavedGame('hard', state)))!;
    expect(parsed.version).toBe(2);
    expect(parsed.hintsLeft).toBe(2);
  });

  it('버전 1 저장(M2b)은 남은 힌트를 그 난이도의 전체 횟수로 채워 읽는다', () => {
    const raw = mutate((r) => {
      r.version = 1;
      delete r.hintsLeft;
    });
    const parsed = parseSavedGame(raw)!;
    expect(parsed).not.toBeNull();
    expect(parsed.version).toBe(2);
    expect(parsed.hintsLeft).toBe(0); // 쉬움은 0회
  });
});

describe('저장소 입출력', () => {
  it('저장·읽기·삭제', () => {
    const saved = toSavedGame('easy', playedState());
    saveGame(saved);
    expect(loadSavedGame()).toEqual(parseSavedGame(roundTrip(saved)));
    clearSavedGame();
    expect(localStorage.getItem(SAVE_KEY)).toBeNull();
    expect(loadSavedGame()).toBeNull();
  });

  it('JSON이 깨져 있으면 null', () => {
    localStorage.setItem(SAVE_KEY, '{not json');
    expect(loadSavedGame()).toBeNull();
  });

  it('난이도 선택을 저장하고 모르는 값은 무시한다', () => {
    expect(loadDifficulty()).toBeNull();
    saveDifficulty('expert');
    expect(loadDifficulty()).toBe('expert');
    localStorage.setItem(DIFFICULTY_KEY, 'insane');
    expect(loadDifficulty()).toBeNull();
  });

  it('저장소를 쓸 수 없어도 예외를 던지지 않는다', () => {
    vi.stubGlobal('window', {
      get localStorage(): Storage {
        throw new DOMException('denied', 'SecurityError');
      },
    });
    expect(() => saveGame(toSavedGame('easy', playedState()))).not.toThrow();
    expect(() => clearSavedGame()).not.toThrow();
    expect(() => saveDifficulty('hard')).not.toThrow();
    expect(loadSavedGame()).toBeNull();
    expect(loadDifficulty()).toBeNull();
  });
});
