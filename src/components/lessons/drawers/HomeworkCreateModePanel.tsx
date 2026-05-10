'use client';

import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

export type CreateType = 'quiz' | 'reading' | 'exercise';

const CREATE_TYPE_OPTIONS: { value: CreateType; label: string }[] = [
  { value: 'quiz', label: 'Quiz' },
  { value: 'reading', label: 'Reading' },
  { value: 'exercise', label: 'Exercise' },
];

interface PickerItem { id: string; title: string; subtitle?: string }

interface Props {
  createType: CreateType;
  setCreateType: (v: CreateType) => void;

  quizId: string;
  onQuizChange: (id: string) => void;
  quizItems: PickerItem[];
  quizzesLoading: boolean;

  contentResourceId: string;
  onContentChange: (id: string) => void;
  contentItems: PickerItem[];
  contentLoading: boolean;

  exerciseQuestionIdsRaw: string;
  setExerciseQuestionIdsRaw: (v: string) => void;
  exerciseIdsCount: number;
  exerciseIdsValid: boolean;

  dueDate: string;
  setDueDate: (v: string) => void;
  totalMarks: number;
  setTotalMarks: (n: number) => void;
}

export function HomeworkCreateModePanel(props: Props) {
  const {
    createType, setCreateType,
    quizId, onQuizChange, quizItems, quizzesLoading,
    contentResourceId, onContentChange, contentItems, contentLoading,
    exerciseQuestionIdsRaw, setExerciseQuestionIdsRaw, exerciseIdsCount, exerciseIdsValid,
    dueDate, setDueDate, totalMarks, setTotalMarks,
  } = props;

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
        Quick-create captures the essentials. For a full setup
        (attachments, late policy, comprehension generation), use the{' '}
        <Link href="/teacher/homework/new" className="underline">
          homework wizard
        </Link>
        .
      </div>

      <div>
        <Label htmlFor="hw-type">
          Type <span className="text-destructive">*</span>
        </Label>
        <Select value={createType} onValueChange={(v: unknown) => setCreateType(v as CreateType)}>
          <SelectTrigger id="hw-type" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {CREATE_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {createType === 'quiz' && (
        <div>
          <Label htmlFor="hw-quiz">
            Quiz <span className="text-destructive">*</span>
          </Label>
          {quizzesLoading ? <LoadingSpinner />
            : quizItems.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No quizzes available. Create one in the Learning module first.
              </p>
            ) : (
              <Select value={quizId} onValueChange={(v: unknown) => onQuizChange((v as string) ?? '')}>
                <SelectTrigger id="hw-quiz" className="w-full">
                  <SelectValue placeholder="Select a quiz" />
                </SelectTrigger>
                <SelectContent>
                  {quizItems.map((q) => (
                    <SelectItem key={q.id} value={q.id}>
                      <div className="flex flex-col">
                        <span className="truncate">{q.title}</span>
                        {q.subtitle && <span className="text-xs text-muted-foreground truncate">{q.subtitle}</span>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
        </div>
      )}

      {createType === 'reading' && (
        <div>
          <Label htmlFor="hw-content">
            Content resource <span className="text-destructive">*</span>
          </Label>
          {contentLoading ? <LoadingSpinner />
            : contentItems.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No approved content resources available.
              </p>
            ) : (
              <Select value={contentResourceId} onValueChange={(v: unknown) => onContentChange((v as string) ?? '')}>
                <SelectTrigger id="hw-content" className="w-full">
                  <SelectValue placeholder="Select a reading resource" />
                </SelectTrigger>
                <SelectContent>
                  {contentItems.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex flex-col">
                        <span className="truncate">{c.title}</span>
                        {c.subtitle && <span className="text-xs text-muted-foreground truncate">{c.subtitle}</span>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
        </div>
      )}

      {createType === 'exercise' && (
        <div>
          <Label htmlFor="hw-questions">
            Question IDs <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="hw-questions"
            className="w-full min-h-20 font-mono text-xs"
            value={exerciseQuestionIdsRaw}
            onChange={(e) => setExerciseQuestionIdsRaw(e.target.value)}
            placeholder="Comma-separated MongoDB IDs (24 hex chars)"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Pick questions from{' '}
            <Link href="/teacher/curriculum/questions" className="underline">Question Bank</Link>{' '}
            and paste their IDs here.{' '}
            {exerciseIdsCount > 0 && !exerciseIdsValid && (
              <span className="text-destructive">
                One or more IDs are not valid 24-character hex.
              </span>
            )}
            {exerciseIdsValid && <span>{exerciseIdsCount} question(s) ready.</span>}
          </p>
        </div>
      )}

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
        <div>
          <Label htmlFor="hw-due">
            Due date <span className="text-destructive">*</span>
          </Label>
          <Input
            id="hw-due" type="date" className="w-full"
            value={dueDate} onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="hw-marks">
            Total marks <span className="text-destructive">*</span>
          </Label>
          <Input
            id="hw-marks" type="number" min={0} max={1000} className="w-full"
            value={totalMarks} onChange={(e) => setTotalMarks(Number(e.target.value))}
          />
        </div>
      </div>
    </div>
  );
}
