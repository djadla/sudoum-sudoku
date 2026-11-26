import { useEffect, useId, useRef } from 'react';
import type { MessageKey } from '../i18n';
import { useI18n } from '../i18n/I18nProvider';

interface GuideDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

const RULES = ['guide.rule1', 'guide.rule2', 'guide.rule3'] as const satisfies readonly MessageKey[];
const PLAY = [
  'guide.play1',
  'guide.play2',
  'guide.play3',
  'guide.play4',
  'guide.play5',
  'guide.play6',
  'guide.play7',
] as const satisfies readonly MessageKey[];
const KEYS = [
  ['guide.keyDigits', 'guide.keyDigitsDesc'],
  ['guide.keyErase', 'guide.keyEraseDesc'],
  ['guide.keyNotes', 'guide.keyNotesDesc'],
  ['guide.keyCandidates', 'guide.keyCandidatesDesc'],
  ['guide.keyMove', 'guide.keyMoveDesc'],
  ['guide.keyUndo', 'guide.keyUndoDesc'],
  ['guide.keyRedo', 'guide.keyRedoDesc'],
  ['guide.keyClose', 'guide.keyCloseDesc'],
] as const satisfies readonly (readonly [MessageKey, MessageKey])[];

/**
 * 규칙·조작법·단축키 안내.
 * 브라우저 기본 모달 `<dialog>`를 써서 바깥 내용 비활성화·Esc 닫기를 브라우저에 맡긴다.
 */
export function GuideDialog({ open, onClose }: GuideDialogProps) {
  const { t } = useI18n();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  // 닫기는 한 경로로만 처리한다: 무엇으로 닫든(닫기 버튼·Esc·부모의 open=false) 실제 <dialog>를 닫고,
  // 그때 브라우저가 보내는 close 이벤트에서만 onClose를 부른다. (onClose가 두 번 불리지 않게)
  // 이 effect는 open prop과 <dialog>의 실제 상태를 맞추는 일만 한다.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // 브라우저마다 처음 포커스 위치가 달라 닫기 버튼으로 맞춘다.
      closeRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="guide"
      aria-labelledby={titleId}
      onClose={onClose}
      // 게임 단축키가 대화상자 안의 키 입력을 가로채지 않게 한다.
      data-no-game-keys
    >
      <div className="guide-header">
        <h2 id={titleId}>{t('guide.title')}</h2>
        <button ref={closeRef} type="button" className="tool compact" onClick={() => dialogRef.current?.close()}>
          {t('guide.close')}
        </button>
      </div>

      <h3>{t('guide.rulesTitle')}</h3>
      <ul>
        {RULES.map((key) => (
          <li key={key}>{t(key)}</li>
        ))}
      </ul>

      <h3>{t('guide.playTitle')}</h3>
      <ul>
        {PLAY.map((key) => (
          <li key={key}>{t(key)}</li>
        ))}
      </ul>

      <h3>{t('guide.keysTitle')}</h3>
      <dl className="guide-keys">
        {KEYS.map(([key, desc]) => (
          <div key={key}>
            <dt>
              <kbd>{t(key)}</kbd>
            </dt>
            <dd>{t(desc)}</dd>
          </div>
        ))}
      </dl>
    </dialog>
  );
}
