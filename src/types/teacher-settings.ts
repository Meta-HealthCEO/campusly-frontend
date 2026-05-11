export interface SubjectsByGradeEntry {
  gradeId: string;
  subjectIds: string[];
}

export interface TeachingScope {
  grades: string[];
  subjectsByGrade: SubjectsByGradeEntry[];
}
