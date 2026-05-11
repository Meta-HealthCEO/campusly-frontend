'use client';

import {
  BookOpen,
  FileText,
  Activity,
  NotebookPen,
  Lightbulb,
  ListChecks,
  ListPlus,
  Briefcase,
  FileBarChart2,
} from 'lucide-react';
import type { LessonMaterialKind } from '@/types/lesson';

interface Tile {
  kind: LessonMaterialKind;
  label: string;
  icon: typeof BookOpen;
  desc: string;
}

const TILES: Tile[] = [
  { kind: 'reading',            label: 'Reading',            icon: BookOpen,        desc: 'Textbook section + optional comprehension Qs' },
  { kind: 'worksheet',          label: 'Worksheet',          icon: FileText,        desc: 'Practice problems' },
  { kind: 'activity',           label: 'Activity',           icon: Activity,        desc: 'Hands-on or group activity' },
  { kind: 'study_notes',        label: 'Notes',              icon: NotebookPen,     desc: 'Concept exposition or recap' },
  { kind: 'worked_example',     label: 'Worked Example',     icon: Lightbulb,       desc: 'Step-by-step model solution' },
  { kind: 'quiz',               label: 'Quiz',               icon: ListChecks,      desc: 'Link an existing quiz' },
  { kind: 'practice_questions', label: 'Practice Questions', icon: ListPlus,        desc: 'Bank-generated questions' },
  { kind: 'homework',           label: 'Homework',           icon: Briefcase,       desc: 'Create or link a homework' },
  { kind: 'paper',              label: 'Paper',              icon: FileBarChart2,   desc: 'Test or exam paper' },
];

interface Props {
  onPick: (kind: LessonMaterialKind) => void;
}

export function MaterialTypePicker({ onPick }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {TILES.map(({ kind, label, icon: Icon, desc }) => (
        <button
          key={kind}
          type="button"
          onClick={() => onPick(kind)}
          className="flex flex-col items-start gap-2 p-3 border rounded-md hover:bg-muted text-left transition-colors"
        >
          <Icon className="h-5 w-5 text-primary" />
          <span className="font-medium">{label}</span>
          <span className="text-xs text-muted-foreground">{desc}</span>
        </button>
      ))}
    </div>
  );
}
