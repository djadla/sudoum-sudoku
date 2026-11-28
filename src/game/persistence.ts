import {
  DIFFICULTY_LEVELS,
  HINT_ALLOWANCE,
  LEGACY_DIFFICULTY_LEVELS,
  isDifficultyId,
  type DifficultyId,
} from '../engine/difficulty';
import { findConflicts } from '../engine/grid';
import { CELL_COUNT, type Puzzle } from '../engine/types';
import type { GameState, NoteMask } from './state';

/**
 * 진행 중인 게임 하나를 localStorage에 저장한다.
 * - 퍼즐(문제·정답)을 함께 저장해, 다시 열 때 생성(최대 수 초)을 기다리지 않는다.
 * - 실행 취소 기록은 저장하지 않는다. (M2 결정)
 * 저장 형식을 바꾸면 SAVE_VERSION을 올린다. 모르는 버전이거나 내용이 잘못된 저장은 버린다.
 * - 버전 1(M2b): 남은 힌트 없음 → 읽을 때 그 난이도의 전체 힌트 횟수로 채운다. (ADR-0003 7번)
 * - 버전 2(M3b): 남은 힌트 횟수(hintsLeft) 추가
 * - 저장 키가 하나뿐이라 여러 탭에서 동시에 하면 마지막으로 저장한 탭의 게임이 남는다.
 *   개인용 단일 게임 저장이라 의도한 동작이다. (기록·통계를 만들 때 필요하면 다시 검토)
 */
export const SAVE_KEY = 'sudoum.game';
export const DIFFICULTY_KEY = 'sudoum.difficulty';
/** 후보 숫자 자동 표시 켬/끔. 게임 저장과 별개인 사용자 설정이다. */
export const CANDIDATES_KEY = 'sudoum.showCandidates';
export const SAVE_VERSION = 2;

export interface SavedGame {
  readonly version: typeof SAVE_VERSION;
  readonly difficulty: DifficultyId;
  readonly puzzle: Puzzle;
  readonly values: readonly number[];
  readonly notes: readonly NoteMask[];
  readonly hintsLeft: number;
}

export function toSavedGame(difficulty: DifficultyId, state: GameState): SavedGame {
  return {
    version: SAVE_VERSION,
    difficulty,
    puzzle: state.puzzle,
    values: state.values,
    notes: state.notes,
    hintsLeft: state.hintsLeft,
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function isIntArray(value: unknown, min: number, max: number): value is number[] {
  return (
    Array.isArray(value) &&
    value.length === CELL_COUNT &&
    value.every((n) => Number.isInteger(n) && n >= min && n <= max)
  );
}

/** 메모 마스크는 1~9번 비트만 쓴다. (0번 비트 없음) */
const NOTE_MASK_MAX = 0b11_1111_1110;

/** 저장된 값을 검사해 올바르면 SavedGame으로, 아니면 null로 돌려준다. */
export function parseSavedGame(raw: unknown): SavedGame | null {
  if (!isRecord(raw) || (raw.version !== 1 && raw.version !== SAVE_VERSION) || !isDifficultyId(raw.difficulty)) {
    return null;
  }
  const allowance = HINT_ALLOWANCE[raw.difficulty];
  const hintsLeft = raw.version === 1 ? allowance : raw.hintsLeft;
  if (!Number.isInteger(hintsLeft) || (hintsLeft as number) < 0 || (hintsLeft as number) > allowance) return null;
  const { puzzle, values, notes } = raw;
  if (!isRecord(puzzle) || !isIntArray(values, 0, 9) || !isIntArray(notes, 0, NOTE_MASK_MAX)) return null;
  if (notes.some((mask) => (mask & 1) !== 0)) return null;
  const { givens, solution, seed, difficulty: level } = puzzle;
  if (!isIntArray(givens, 0, 9) || !isIntArray(solution, 1, 9)) return null;
  // 난이도와 레벨이 맞아야 한다. 대응표를 바꾸기 전에 저장한 게임(이전 레벨)도 이어서 읽는다.
  const levelMatches =
    level === DIFFICULTY_LEVELS[raw.difficulty] ||
    (LEGACY_DIFFICULTY_LEVELS[raw.difficulty] as readonly unknown[]).includes(level);
  if (!Number.isInteger(seed) || !levelMatches) return null;
  // 정답이 스도쿠 규칙(행·열·박스마다 1~9 한 번씩)을 지켜야 정답대로 채웠을 때 완성할 수 있다.
  // 주어진 숫자는 아래에서 정답과 같은지 확인하므로, 정답이 올바르면 퍼즐도 모순이 없다.
  // (해가 하나뿐인지는 sudoku-core가 필요해 검사하지 않는다. 완성 판정은 저장된 정답으로 한다)
  if (findConflicts(solution).some(Boolean)) return null;

  for (let index = 0; index < CELL_COUNT; index++) {
    const given = givens[index]!;
    // 주어진 숫자는 정답과 같고 보드에서 바뀌지 않아야 한다.
    if (given !== 0 && (given !== solution[index] || values[index] !== given)) return null;
    // 숫자가 있는 칸에는 메모가 없다.
    if (values[index] !== 0 && notes[index] !== 0) return null;
  }

  return {
    version: SAVE_VERSION,
    difficulty: raw.difficulty,
    puzzle: { givens, solution, seed: seed as number, difficulty: level as Puzzle['difficulty'] },
    values,
    notes,
    hintsLeft: hintsLeft as number,
  };
}

// localStorage를 쓸 수 없는 환경(사생활 보호 모드, 저장 공간 초과 등)에서는 저장 없이 동작한다.
function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // 저장하지 못해도 게임은 계속한다.
  }
}

export function loadSavedGame(): SavedGame | null {
  const text = read(SAVE_KEY);
  if (text === null) return null;
  try {
    return parseSavedGame(JSON.parse(text));
  } catch {
    return null;
  }
}

export function saveGame(saved: SavedGame): void {
  write(SAVE_KEY, JSON.stringify(saved));
}

export function clearSavedGame(): void {
  write(SAVE_KEY, null);
}

/** 마지막으로 고른 난이도. 새 게임의 기본값으로 쓴다. */
export function loadDifficulty(): DifficultyId | null {
  const value = read(DIFFICULTY_KEY);
  return isDifficultyId(value) ? value : null;
}

export function saveDifficulty(difficulty: DifficultyId): void {
  write(DIFFICULTY_KEY, difficulty);
}

export function loadShowCandidates(): boolean {
  return read(CANDIDATES_KEY) === 'true';
}

export function saveShowCandidates(show: boolean): void {
  write(CANDIDATES_KEY, show ? 'true' : null);
}

/** 화면 테마. 'system'은 저장하지 않는다(기본값). index.html의 인라인 스크립트도 이 키를 읽는다. */
export const THEME_KEY = 'sudoum.theme';
export type ThemePreference = 'system' | 'light' | 'dark';

export function loadTheme(): ThemePreference {
  const value = read(THEME_KEY);
  return value === 'light' || value === 'dark' ? value : 'system';
}

export function saveTheme(theme: ThemePreference): void {
  write(THEME_KEY, theme === 'system' ? null : theme);
}
