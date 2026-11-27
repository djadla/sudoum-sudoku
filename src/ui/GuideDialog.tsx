import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import type { MessageKey } from '../i18n';
import { useI18n } from '../i18n/I18nProvider';
import { AdvancedLessonsPanel, BasicLessonsPanel } from './guide/LessonsPanel';
import type { LessonTarget } from './guide/lessons';

interface GuideDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  /** 특정 설명으로 열 때 (힌트의 "이 기법 배우기"). 없으면 플레이 방법 탭으로 연다. */
  readonly target?: LessonTarget | null;
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

const TABS = [
  { id: 'play', label: 'lesson.tabPlay' },
  { id: 'basic', label: 'lesson.tabBasic' },
  { id: 'advanced', label: 'lesson.tabAdvanced' },
] as const satisfies readonly { id: string; label: MessageKey }[];

type TabId = (typeof TABS)[number]['id'];

/**
 * 규칙·조작법·단축키 안내와 풀이 설명. 세 탭(플레이 방법 / 기본 풀이 / 고급 풀이)으로 나눈다.
 * 브라우저 기본 모달 `<dialog>`를 써서 바깥 내용 비활성화·Esc 닫기를 브라우저에 맡긴다.
 */
export function GuideDialog({ open, onClose, target }: GuideDialogProps) {
  const { t } = useI18n();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const tabsId = useId();
  const [tab, setTab] = useState<TabId>('play');
  const tabRefs = useRef<Record<TabId, HTMLButtonElement | null>>({ play: null, basic: null, advanced: null });

  // 탭 목록 안에서는 방향키·Home·End로 탭을 옮긴다. (WAI-ARIA Tabs 패턴, 선택과 동시에 표시)
  function onTabKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = TABS.findIndex((item) => item.id === tab);
    const next =
      event.key === 'ArrowRight'
        ? (index + 1) % TABS.length
        : event.key === 'ArrowLeft'
          ? (index - 1 + TABS.length) % TABS.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? TABS.length - 1
              : -1;
    if (next < 0) return;
    event.preventDefault();
    const id = TABS[next]!.id;
    setTab(id);
    tabRefs.current[id]?.focus();
  }

  // 닫기는 한 경로로만 처리한다: 무엇으로 닫든(닫기 버튼·Esc·부모의 open=false) 실제 <dialog>를 닫고,
  // 그때 브라우저가 보내는 close 이벤트에서만 onClose를 부른다. (onClose가 두 번 불리지 않게)
  // 이 effect는 open prop과 <dialog>의 실제 상태를 맞추는 일만 한다.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      // 열 때마다 대상 탭으로 시작한다. (대상이 없으면 플레이 방법)
      setTab(target?.tab ?? 'play');
      dialog.showModal();
      // 브라우저마다 처음 포커스 위치가 달라 닫기 버튼으로 맞춘다.
      closeRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, target]);

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

      <div className="guide-tabs" role="tablist" aria-label={t('lesson.tabsLabel')} onKeyDown={onTabKeyDown}>
        {TABS.map((item) => (
          <button
            key={item.id}
            ref={(el) => {
              tabRefs.current[item.id] = el;
            }}
            type="button"
            role="tab"
            id={`${tabsId}-tab-${item.id}`}
            aria-selected={tab === item.id}
            aria-controls={`${tabsId}-panel-${item.id}`}
            tabIndex={tab === item.id ? 0 : -1}
            className="guide-tab"
            onClick={() => setTab(item.id)}
          >
            {t(item.label)}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`${tabsId}-panel-${tab}`}
        aria-labelledby={`${tabsId}-tab-${tab}`}
        className="guide-panel"
        tabIndex={0}
      >
        {tab === 'play' && (
          <>
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
          </>
        )}
        {/* 대상이 바뀌면 그 설명부터 보이도록 key로 다시 만든다. */}
        {tab === 'basic' && <BasicLessonsPanel key={target?.id ?? 'basic'} initialId={target?.id} />}
        {tab === 'advanced' && <AdvancedLessonsPanel key={target?.id ?? 'advanced'} initialId={target?.id} />}
      </div>
    </dialog>
  );
}
