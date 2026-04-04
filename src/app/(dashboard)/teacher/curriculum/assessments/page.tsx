'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardList, Plus, FileText, Sparkles, AlertTriangle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { PaperGenerateDialog } from '@/components/questions';
import { useQuestionBank } from '@/hooks/useQuestionBank';
import { useSubjects, useGrades } from '@/hooks/useAcademics';
import { useAuthStore } from '@/stores/useAuthStore';
import { extractErrorMessage } from '@/lib/api-helpers';
import { toast } from 'sonner';
import type {
  AssessmentPaperItem,
  PaperType,
  PaperStatus,
  PaperFilters,
  CreatePaperPayload,
  GeneratePaperPayload,
} from '@/types/question-bank';

const PAPER_TYPES: { value: PaperType; label: string }[] = [
  { value: 'class_test', label: 'Class Test' },
  { value: 'assignment', label: 'Assignment' },
  { value: 'mid_year', label: 'Mid-Year' },
  { value: 'trial', label: 'Trial' },
  { value: 'final', label: 'Final' },
  { value: 'custom', label: 'Custom' },
];

const PAPER_TYPE_LABELS: Record<PaperType, string> = Object.fromEntries(
  PAPER_TYPES.map((pt) => [pt.value, pt.label]),
) as Record<PaperType, string>;

const STATUS_BADGE_VARIANT: Record<PaperStatus, 'secondary' | 'default' | 'outline'> = {
  draft: 'secondary', finalised: 'default', archived: 'outline',
};
const STATUS_LABELS: Record<PaperStatus, string> = {
  draft: 'Draft', finalised: 'Finalised', archived: 'Archived',
};
const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'finalised', label: 'Finalised' },
  { value: 'archived', label: 'Archived' },
];

interface PaperFormValues {
  title: string;
  subjectId: string;
  gradeId: string;
  term: number;
  year: number;
  paperType: PaperType;
  duration: number;
  instructions: string;
}

const FORM_DEFAULTS: PaperFormValues = {
  title: '', subjectId: '', gradeId: '', term: 1,
  year: new Date().getFullYear(), paperType: 'class_test', duration: 60, instructions: '',
};

const getSubjectName = (s: AssessmentPaperItem['subjectId']) => typeof s === 'string' ? s : s.name;
const getGradeName = (g: AssessmentPaperItem['gradeId']) => typeof g === 'string' ? g : g.name;
const questionCount = (p: AssessmentPaperItem) => p.sections.reduce((sum, s) => sum + s.questions.length, 0);

export default function TeacherAssessmentsPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const {
    papers, papersTotal, papersLoading,
    fetchPapers, createPaper, generatePaper,
  } = useQuestionBank();
  const { subjects } = useSubjects();
  const { grades } = useGrades();

  const [statusFilter, setStatusFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);

  const filters = useMemo((): PaperFilters => {
    const f: PaperFilters = {};
    if (statusFilter !== 'all') f.status = statusFilter as PaperStatus;
    return f;
  }, [statusFilter]);
  useEffect(() => { fetchPapers(filters); }, [filters, fetchPapers]);

  const { register, handleSubmit, setValue, watch, reset, formState: { isSubmitting } } =
    useForm<PaperFormValues>({ defaultValues: FORM_DEFAULTS });
  useEffect(() => { if (createOpen) reset(FORM_DEFAULTS); }, [createOpen, reset]);

  const onSubmitCreate = useCallback(async (data: PaperFormValues) => {
    try {
      const payload: CreatePaperPayload = {
        title: data.title,
        subjectId: data.subjectId,
        gradeId: data.gradeId,
        term: data.term,
        year: data.year,
        paperType: data.paperType,
        duration: data.duration,
        instructions: data.instructions || undefined,
      };
      await createPaper(payload);
      setCreateOpen(false);
      await fetchPapers(filters);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to create paper'));
    }
  }, [createPaper, fetchPapers, filters]);

  const handlePaperClick = useCallback((paper: AssessmentPaperItem) => {
    router.push(`/teacher/curriculum/assessments/${paper.id}`);
  }, [router]);

  const handleGenerate = useCallback(async (payload: GeneratePaperPayload) => {
    try {
      const paper = await generatePaper(payload);
      setGenerateOpen(false);
      router.push(`/teacher/curriculum/assessments/${paper.id}`);
      return paper;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to generate paper'));
      return null;
    }
  }, [generatePaper, router]);

  if (!user?.schoolId) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="School not configured"
        description="You need to be part of a school to use this feature. Contact your administrator or complete onboarding."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Assessments" description="Create and manage assessment papers">
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setGenerateOpen(true)}>
            <Sparkles className="mr-2 size-4" />
            Generate Paper
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 size-4" />
            Create Paper
          </Button>
        </div>
      </PageHeader>

      {/* Status filter */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={(v: unknown) => setStatusFilter(v as string)}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!papersLoading && (
          <Badge variant="secondary">
            {papersTotal} paper{papersTotal !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Content */}
      {papersLoading ? (
        <LoadingSpinner />
      ) : papers.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No assessment papers"
          description="Create your first assessment paper to get started."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 size-4" />
              Create Paper
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {papers.map((paper: AssessmentPaperItem) => (
            <Card
              key={paper.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => handlePaperClick(paper)}
            >
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                    <h3 className="font-medium truncate">{paper.title}</h3>
                  </div>
                  <Badge variant={STATUS_BADGE_VARIANT[paper.status]}>
                    {STATUS_LABELS[paper.status]}
                  </Badge>
                </div>

                <p className="text-sm text-muted-foreground truncate">
                  {getSubjectName(paper.subjectId)} - {getGradeName(paper.gradeId)}
                </p>

                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline">{PAPER_TYPE_LABELS[paper.paperType]}</Badge>
                  <Badge variant="outline">Term {paper.term}, {paper.year}</Badge>
                  <Badge variant="secondary">{paper.totalMarks} marks</Badge>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{paper.sections.length} section{paper.sections.length !== 1 ? 's' : ''}</span>
                  <span>{questionCount(paper)} question{questionCount(paper) !== 1 ? 's' : ''}</span>
                  <span>{paper.duration} min</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Paper Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Assessment Paper</DialogTitle>
            <DialogDescription>Set up the paper metadata. Add questions later.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmitCreate)} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto space-y-4 py-4">
              <div>
                <Label htmlFor="p-title">Title <span className="text-destructive">*</span></Label>
                <Input id="p-title" {...register('title', { required: true })} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Subject <span className="text-destructive">*</span></Label>
                  <Select
                    value={watch('subjectId')}
                    onValueChange={(v: unknown) => setValue('subjectId', v as string)}
                  >
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {subjects.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Grade <span className="text-destructive">*</span></Label>
                  <Select
                    value={watch('gradeId')}
                    onValueChange={(v: unknown) => setValue('gradeId', v as string)}
                  >
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {grades.map((g) => (
                        <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="p-term">Term <span className="text-destructive">*</span></Label>
                  <Input id="p-term" type="number" min={1} max={4} {...register('term', { required: true, valueAsNumber: true })} />
                </div>
                <div>
                  <Label htmlFor="p-year">Year <span className="text-destructive">*</span></Label>
                  <Input id="p-year" type="number" {...register('year', { required: true, valueAsNumber: true })} />
                </div>
                <div>
                  <Label htmlFor="p-dur">Duration (min)</Label>
                  <Input id="p-dur" type="number" min={1} {...register('duration', { valueAsNumber: true })} />
                </div>
              </div>

              <div>
                <Label>Paper Type <span className="text-destructive">*</span></Label>
                <Select
                  value={watch('paperType')}
                  onValueChange={(v: unknown) => setValue('paperType', v as PaperType)}
                >
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAPER_TYPES.map((pt) => (
                      <SelectItem key={pt.value} value={pt.value}>{pt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="p-inst">Instructions</Label>
                <Textarea id="p-inst" rows={3} {...register('instructions')} />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Paper'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Generate Paper Dialog */}
      <PaperGenerateDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        subjects={subjects}
        grades={grades}
        onGenerate={handleGenerate}
      />
    </div>
  );
}
