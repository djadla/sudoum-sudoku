import { useState } from 'react';
import type { PlainMessageKey } from '../../i18n';
import { useI18n } from '../../i18n/I18nProvider';
import { LessonPlayer } from './LessonPlayer';
import { ADVANCED_LESSONS, BASIC_LESSONS, type Lesson } from './lessons';

interface LessonsPanelProps {
  readonly lessons: readonly Lesson[];
  readonly intro: PlainMessageKey;
  /** 처음에 보여 줄 기법 (힌트의 "이 기법 배우기"로 열 때) */
  readonly initialId?: string;
}

/**
 * 풀이 탭: 기법을 하나 골라 움직이는 설명을 본다.
 * 여러 애니메이션이 한꺼번에 움직이면 산만하므로 한 번에 하나만 보여 준다.
 */
function LessonsPanel({ lessons, intro, initialId }: LessonsPanelProps) {
  const { t } = useI18n();
  const [selected, setSelected] = useState(() => Math.max(0, lessons.findIndex((l) => l.id === initialId)));
  const lesson = lessons[selected]!;

  return (
    <div className="lessons">
      <p className="lesson-intro">{t(intro)}</p>
      <div className="lesson-chips" role="group" aria-label={t('lesson.lessonsLabel')}>
        {lessons.map((item, index) => (
          <button
            key={item.id}
            type="button"
            className="tool compact"
            aria-pressed={index === selected}
            onClick={() => setSelected(index)}
          >
            {t(item.title)}
          </button>
        ))}
      </div>
      <h3>{t(lesson.title)}</h3>
      <p className="lesson-summary">{t(lesson.summary)}</p>
      {/* 기법을 바꾸면 처음 단계부터 다시 재생한다. */}
      <LessonPlayer key={lesson.id} lesson={lesson} />
    </div>
  );
}

export function BasicLessonsPanel({ initialId }: { readonly initialId?: string }) {
  return <LessonsPanel lessons={BASIC_LESSONS} intro="lesson.basicIntro" initialId={initialId} />;
}

export function AdvancedLessonsPanel({ initialId }: { readonly initialId?: string }) {
  return <LessonsPanel lessons={ADVANCED_LESSONS} intro="lesson.advancedIntro" initialId={initialId} />;
}
