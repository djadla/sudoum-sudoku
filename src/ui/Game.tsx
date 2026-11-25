import { useEffect, useReducer } from 'react';
import { canRedo, canUndo, gameReducer, type GameAction, type GameState } from '../game/state';
import { useI18n } from '../i18n/I18nProvider';
import { Board } from './Board';
import { Controls } from './Controls';

interface GameProps {
  /** 시작 상태 (새 게임 또는 저장에서 복원한 게임) */
  readonly initialState: GameState;
  /** 보드가 바뀔 때마다 호출한다. (진행 저장용) */
  readonly onChange?: (state: GameState) => void;
}

const ARROWS: Record<string, { dRow: number; dCol: number }> = {
  ArrowUp: { dRow: -1, dCol: 0 },
  ArrowDown: { dRow: 1, dCol: 0 },
  ArrowLeft: { dRow: 0, dCol: -1 },
  ArrowRight: { dRow: 0, dCol: 1 },
};

/** 수정키 없이 누른 키를 게임 동작으로 바꾼다. 해당하지 않는 키는 null */
export function keyToAction(key: string): GameAction | null {
  if (/^[1-9]$/.test(key)) return { type: 'input', digit: Number(key) };
  if (key === 'Backspace' || key === 'Delete' || key === '0') return { type: 'erase' };
  if (key === 'n' || key === 'N') return { type: 'toggleNoteMode' };
  const arrow = ARROWS[key];
  return arrow ? { type: 'move', ...arrow } : null;
}

type KeyInput = Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>;

/**
 * 키 이벤트를 게임 동작으로 바꾼다.
 * Ctrl/⌘ 조합은 실행 취소(Z)·다시 하기(Shift+Z, Y)만 받고, 나머지는 브라우저 단축키로 남긴다.
 */
export function eventToAction(event: KeyInput): GameAction | null {
  if (event.altKey) return null;
  if (event.ctrlKey || event.metaKey) {
    const key = event.key.toLowerCase();
    if (key === 'z') return { type: event.shiftKey ? 'redo' : 'undo' };
    if (key === 'y' && !event.shiftKey) return { type: 'redo' };
    return null;
  }
  return keyToAction(event.key);
}

/** 퍼즐 하나의 플레이 화면. 새 게임은 부모가 key를 바꿔 다시 마운트한다. */
export function Game({ initialState, onChange }: GameProps) {
  const { t } = useI18n();
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const solved = state.status === 'solved';

  // 선택·메모 모드만 바뀐 경우는 저장할 필요가 없으므로 보드(values·notes)가 바뀔 때만 알린다.
  // (onChange는 부모가 useCallback으로 고정해 넘긴다)
  const { values, notes } = state;
  useEffect(() => {
    onChange?.(state);
  }, [values, notes, onChange]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      // 언어 선택기·새 게임 메뉴 등 다른 입력 요소에서 누른 키는 가로채지 않는다.
      if (event.target instanceof Element && event.target.closest('input, select, textarea, [data-no-game-keys]')) {
        return;
      }
      const action = eventToAction(event);
      if (!action) return;
      event.preventDefault();
      dispatch(action);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <section className="game">
      <Board state={state} onSelect={(index) => dispatch({ type: 'select', index })} />

      {solved && (
        <div className="solved" role="status">
          <p>{t('status.solved')}</p>
        </div>
      )}

      <Controls
        noteMode={state.noteMode}
        disabled={solved}
        canUndo={canUndo(state)}
        canRedo={canRedo(state)}
        onDigit={(digit) => dispatch({ type: 'input', digit })}
        onErase={() => dispatch({ type: 'erase' })}
        onToggleNoteMode={() => dispatch({ type: 'toggleNoteMode' })}
        onUndo={() => dispatch({ type: 'undo' })}
        onRedo={() => dispatch({ type: 'redo' })}
      />

      <p className="hint-keys">{t('controls.keyboardHint')}</p>
    </section>
  );
}
