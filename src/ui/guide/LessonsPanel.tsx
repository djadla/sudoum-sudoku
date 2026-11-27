import { useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { LessonPlayer } from './LessonPlayer';
import { ADVANCED_TOPICS, BASIC_LESSONS } from './lessons';

/**
 * 기본 풀이 탭: 기법을 하나 골라 움직이는 설명을 본다.
 * 여러 애니메이션이 한꺼번에 움직이면 산만하므로 한 번에 하나만 보여 준다.
 */
export function BasicLessonsPanel() {
  const { t } = useI18n();
  const [selected, setSelected] = useState(0);
  const lesson = BASIC_LESSONS[selected]!;

  return (
    <div className="lessons">
      <p className="lesson-intro">{t('lesson.basicIntro')}</p>
      <div className="lesson-chips" role="group" aria-label={t('lesson.lessonsLabel')}>
        {BASIC_LESSONS.map((item, index) => (
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

/** 고급 풀이 탭: 지금은 기법별 한 줄 설명. (움직이는 설명은 다음 업데이트) */
export function AdvancedLessonsPanel() {
  const { t } = useI18n();
  return (
    <div className="lessons">
      <p className="lesson-intro">{t('lesson.advancedIntro')}</p>
      <dl className="lesson-topics">
        {ADVANCED_TOPICS.map((topic) => (
          <div key={topic.title}>
            <dt>{t(topic.title)}</dt>
            <dd>{t(topic.summary)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
