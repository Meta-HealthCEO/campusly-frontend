type RefWithName = {
  id?: string;
  _id?: string;
  name?: string;
  level?: number;
};

export type ClassLike = {
  id?: string;
  _id?: string;
  name?: string;
  gradeName?: string;
  grade?: RefWithName | null;
  gradeId?: string | RefWithName | null;
};

function resolveUnknownId(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const record = value as { id?: unknown; _id?: unknown };
    if (typeof record.id === 'string') return record.id;
    if (typeof record._id === 'string') return record._id;
  }
  return '';
}

export function isObjectIdLike(value: string): boolean {
  return /^[0-9a-f]{24}$/i.test(value);
}

export function getClassId(cls: ClassLike): string {
  return resolveUnknownId(cls);
}

export function getClassGradeId(cls?: ClassLike | null): string {
  if (!cls) return '';
  return resolveUnknownId(cls.gradeId) || resolveUnknownId(cls.grade);
}

export function getClassGradeName(cls?: ClassLike | null): string {
  if (!cls) return '';
  if (cls.grade?.name) return cls.grade.name;
  if (cls.gradeName) return cls.gradeName;
  if (typeof cls.gradeId === 'object' && cls.gradeId?.name) return cls.gradeId.name;
  return '';
}

export function formatClassLabel(cls: ClassLike): string {
  const id = getClassId(cls);
  const gradeName = getClassGradeName(cls);
  const className = cls.name && !isObjectIdLike(cls.name) ? cls.name : '';

  if (className && gradeName && !className.toLowerCase().includes(gradeName.toLowerCase())) {
    return `${gradeName} - ${className}`;
  }

  if (className) return className;
  if (gradeName) return `${gradeName} Class`;
  return id ? `Class ${id.slice(-6)}` : 'Class';
}

export function getSubjectGradeIds(subject: {
  gradeId?: unknown;
  gradeIds?: unknown[];
}): string[] {
  if (Array.isArray(subject.gradeIds) && subject.gradeIds.length > 0) {
    return subject.gradeIds.map((grade) => resolveUnknownId(grade)).filter(Boolean);
  }
  const gradeId = resolveUnknownId(subject.gradeId);
  return gradeId ? [gradeId] : [];
}
