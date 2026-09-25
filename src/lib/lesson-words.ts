/**
 * What the AI class Units are called. Standalone teachers know them as
 * "Lessons" (their nav item); school teachers keep Units on the Courses page.
 * Every visible noun on the Units pages comes from here so the two can't drift.
 */
export interface LessonWords {
  one: 'lesson' | 'unit';
  many: 'lessons' | 'units';
  One: 'Lesson' | 'Unit';
  Many: 'Lessons' | 'Courses';
}

const STANDALONE: LessonWords = { one: 'lesson', many: 'lessons', One: 'Lesson', Many: 'Lessons' };
const SCHOOL: LessonWords = { one: 'unit', many: 'units', One: 'Unit', Many: 'Courses' };

export function lessonWords(isStandalone: boolean): LessonWords {
  return isStandalone ? STANDALONE : SCHOOL;
}
