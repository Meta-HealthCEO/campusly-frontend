/** Page words for learners: a standalone teacher's learners see "Lessons" and "Marks" (spec §2). */
export function learnerCopy(isStandalone: boolean) {
  return isStandalone
    ? {
        lessonsTitle: 'Lessons',
        lessonsDescription: 'Lessons your teacher released to your groups. Short items you can do on your phone.',
        lessonsEmpty: 'When your teacher releases a lesson, it appears here.',
        marksTitle: 'Marks',
        marksDescription: 'Your marks for homework, projects and tests.',
        homeworkDescription: 'Homework and projects from your teacher.',
      }
    : {
        lessonsTitle: 'Courses',
        lessonsDescription: 'Units your teachers released to your class. Short items you can do on your phone.',
        lessonsEmpty: 'When your teacher releases a unit to your class, it appears here.',
        marksTitle: 'My Grades',
        marksDescription: 'Track your academic performance across all subjects',
        homeworkDescription: 'Track and submit your assignments.',
      };
}
