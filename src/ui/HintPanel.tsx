import { useEffect, useId, useRef } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import type { HintText } from './hintText';

export type HintPanelState =
  | { readonly status: 'thinking' }
  | { readonly status: 'none' }
  | { readonly status: 'failed' }
  | { readonly status: 'shown'; readonly text: HintText };

interface HintPanelProps {
  readonly state: HintPanelState;
  readonly onApply: () => void;
  readonly onClose: () => void;
  /** 이 기법의 설명을 연다. 설명이 없는 힌트면 undefined (버튼을 보이지 않는다) */
  readonly onLearn?: () => void;
}

/**
 * 힌트 설명 영역. 숫자 패드 자리에 대신 보여 주어 화면 높이를 늘리지 않는다.
 * 새 내용은 화면 낭독기가 읽도록 aria-live로 알리고, 힌트가 나오면 "적용" 버튼에 포커스를 준다.
 */
export function HintPanel({ state, onApply, onClose, onLearn }: HintPanelProps) {
  const { t } = useI18n();
  const titleId = useId();
  const applyRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // 내용이 실제로 바뀔 때만 포커스를 옮긴다. (부모가 다시 그려질 때마다 옮기면 사용자가 보드 칸을 눌러도
  // 포커스를 다시 빼앗아 키 입력이 보드로 가지 않는다)
  const contentKey = state.status === 'shown' ? `shown:${state.text.title}:${state.text.body}` : state.status;
  useEffect(() => {
    if (contentKey.startsWith('shown:')) applyRef.current?.focus();
    else if (contentKey !== 'thinking') closeRef.current?.focus();
  }, [contentKey]);

  return (
    <section className="hint-panel" aria-labelledby={titleId} aria-live="polite" data-no-game-keys>
      {state.status === 'shown' ? (
        <>
          <h2 id={titleId} className="hint-title">
            {state.text.title}
          </h2>
          <p className="hint-body">{state.text.body}</p>
          {state.text.removals && <p className="hint-removals">{state.text.removals}</p>}
          {onLearn && (
            <button type="button" className="hint-learn" onClick={onLearn}>
              {t('hint.learn')}
            </button>
          )}
        </>
      ) : (
        <p id={titleId} className="hint-body">
          {state.status === 'thinking' ? t('hint.thinking') : state.status === 'none' ? t('hint.none') : t('hint.failed')}
        </p>
      )}
      <div className="hint-actions">
        {state.status === 'shown' && (
          <button ref={applyRef} type="button" className="tool primary" onClick={onApply}>
            {t('hint.apply')}
          </button>
        )}
        <button ref={closeRef} type="button" className="tool" onClick={onClose}>
          {t('hint.close')}
        </button>
      </div>
    </section>
  );
}
