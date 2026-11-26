import { useEffect, useReducer, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { HintView } from '../engine/hintTypes';
import {
  canRedo,
  canUndo,
  canUseHint,
  findWrongValue,
  gameReducer,
  type GameAction,
  type GameState,
} from '../game/state';
import { saveShowCandidates } from '../game/persistence';
import { useI18n } from '../i18n/I18nProvider';
import { HintSupersededError, requestHint } from '../workers/requestHint';
import { Board } from './Board';
import { Controls } from './Controls';
import { HintPanel } from './HintPanel';
import { describeHint } from './hintText';

interface GameProps {
  /** 시작 상태 (새 게임 또는 저장에서 복원한 게임) */
  readonly initialState: GameState;
  /** 보드나 남은 힌트가 바뀔 때마다 호출한다. (진행 저장용) */
  readonly onChange?: (state: GameState) => void;
  /**
   * 힌트 버튼을 넣을 자리 (App의 보드 위 막대 안).
   * 막대는 퍼즐을 만드는 동안에도 있어야 하므로 App이 그리고, 힌트 버튼만 portal로 넣는다.
   * (막대를 Game이 그리면 새 게임마다 "새 게임" 메뉴가 다시 마운트되어 포커스를 잃는다)
   */
  readonly hintSlot?: HTMLElement | null;
}

type HintState =
  | { readonly status: 'thinking' }
  | { readonly status: 'none' }
  | { readonly status: 'failed' }
  | { readonly status: 'shown'; readonly view: HintView };

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
  if (key === 'c' || key === 'C') return { type: 'toggleCandidates' };
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
export function Game({ initialState, onChange, hintSlot }: GameProps) {
  const { t } = useI18n();
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const solved = state.status === 'solved';
  const [hint, setHint] = useState<HintState | null>(null);
  const hintButtonRef = useRef<HTMLButtonElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  // 힌트를 닫은 뒤 포커스를 옮길 곳. 렌더링이 끝난 뒤(선택 칸이 바뀐 뒤) 옮긴다.
  const focusAfterHint = useRef<'button' | 'cell' | null>(null);
  // 보드가 바뀔 때마다 올린다. 힌트를 계산하는 동안 보드가 바뀌면 그 결과는 버린다.
  const boardVersion = useRef(0);

  // 선택·메모 모드만 바뀐 경우는 저장할 필요가 없으므로 보드(values·notes)나 남은 힌트가 바뀔 때만 알린다.
  // (onChange는 부모가 useCallback으로 고정해 넘긴다)
  const { values, notes, hintsLeft } = state;
  useEffect(() => {
    onChange?.(state);
  }, [values, notes, hintsLeft, onChange]);

  // 후보 보기 켬/끔은 게임과 별개인 사용자 설정으로 기억한다.
  const { showCandidates } = state;
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    saveShowCandidates(showCandidates);
  }, [showCandidates]);

  // 보드가 바뀌면 보여 주던 힌트는 더 이상 맞지 않으므로 닫는다.
  useEffect(() => {
    boardVersion.current++;
    setHint(null);
  }, [values, notes]);

  /** 힌트를 닫는다. 적용했으면 바뀐 칸으로, 아니면 힌트 버튼으로 포커스를 옮긴다. (버튼이 비활성이면 칸으로) */
  function closeHint(focus: 'button' | 'cell' = 'button') {
    setHint(null);
    focusAfterHint.current = focus;
  }

  useEffect(() => {
    if (hint !== null || focusAfterHint.current === null) return;
    const target = focusAfterHint.current;
    focusAfterHint.current = null;
    const button = hintButtonRef.current;
    if (target === 'button' && button && !button.disabled) {
      button.focus();
      return;
    }
    sectionRef.current?.querySelector<HTMLElement>('[role="gridcell"][tabindex="0"]')?.focus();
  });

  function showHint() {
    if (!canUseHint(state) || hint?.status === 'thinking') return;
    // 틀린 숫자가 있으면 다음 수보다 먼저 알려 준다. (ADR-0003 5번)
    const wrong = findWrongValue(state);
    if (wrong) {
      dispatch({ type: 'useHint' });
      setHint({ status: 'shown', view: wrong });
      return;
    }
    const version = boardVersion.current;
    setHint({ status: 'thinking' });
    requestHint(values, notes).then(
      (view) => {
        if (version !== boardVersion.current) return;
        if (!view) {
          // 적용할 힌트가 없으면 횟수를 쓰지 않는다.
          setHint({ status: 'none' });
          return;
        }
        dispatch({ type: 'useHint' });
        setHint({ status: 'shown', view });
      },
      (error: unknown) => {
        if (error instanceof HintSupersededError || version !== boardVersion.current) return;
        console.warn('[hint] 힌트 계산 실패', error);
        setHint({ status: 'failed' });
      },
    );
  }

  function applyHint() {
    if (hint?.status !== 'shown') return;
    dispatch({ type: 'applyHint', hint: hint.view });
    closeHint('cell');
  }

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

  // Esc로 힌트를 닫는다. (힌트 영역 안의 버튼에 포커스가 있어도 동작해야 하므로 게임 단축키와 따로 받는다)
  useEffect(() => {
    if (!hint) return;
    function onKeyDown(event: KeyboardEvent) {
      // 다른 화면(새 게임 메뉴 등)이 이미 처리한 Esc나 대화상자 안의 Esc는 무시한다. (Esc 한 번에 하나만 닫는다)
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      if (event.target instanceof Element && event.target.closest('dialog')) return;
      closeHint();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hint]);

  const shownHint = hint?.status === 'shown' ? hint.view : null;

  return (
    <section ref={sectionRef} className="game">
      {hintSlot &&
        createPortal(
          <button
            ref={hintButtonRef}
            type="button"
            className="tool compact hint-button"
            onClick={showHint}
            disabled={!canUseHint(state) || hint?.status === 'thinking'}
            aria-expanded={hint !== null}
          >
            {t('hint.button', { count: hintsLeft })}
          </button>,
          hintSlot,
        )}

      <Board state={state} onSelect={(index) => dispatch({ type: 'select', index })} hint={shownHint} />

      {solved && (
        <div className="solved" role="status">
          <p>{t('status.solved')}</p>
        </div>
      )}

      {hint ? (
        <HintPanel
          state={hint.status === 'shown' ? { status: 'shown', text: describeHint(t, hint.view) } : hint}
          onApply={applyHint}
          onClose={() => closeHint()}
        />
      ) : (
      <Controls
        noteMode={state.noteMode}
        disabled={solved}
        canUndo={canUndo(state)}
        canRedo={canRedo(state)}
        onDigit={(digit) => dispatch({ type: 'input', digit })}
        onErase={() => dispatch({ type: 'erase' })}
        onToggleNoteMode={() => dispatch({ type: 'toggleNoteMode' })}
        showCandidates={state.showCandidates}
        onToggleCandidates={() => dispatch({ type: 'toggleCandidates' })}
        onUndo={() => dispatch({ type: 'undo' })}
        onRedo={() => dispatch({ type: 'redo' })}
      />
      )}

      <p className="hint-keys">{t('controls.keyboardHint')}</p>
    </section>
  );
}
