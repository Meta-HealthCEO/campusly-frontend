'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Download, FileText, ChevronLeft, CheckCircle, ShieldCheck } from 'lucide-react';
import { useTeacherPapers } from '@/hooks/useTeacherPapers';
import { usePaperModeration } from '@/hooks/usePaperModeration';
import { useAuthStore } from '@/stores/useAuthStore';
import { Button } from '@/components/ui/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusChip } from '@/components/shared/StatusChip';
import { moderationChip } from '@/lib/moderation-chip';
import { PaperDetailPaperTab } from '@/components/papers/PaperDetailPaperTab';
import { PaperDetailMemoTab } from '@/components/papers/PaperDetailMemoTab';
import { PaperDetailAssignmentsTab } from '@/components/papers/PaperDetailAssignmentsTab';
import { PaperDetailMarkingTab } from '@/components/papers/PaperDetailMarkingTab';
import { paperTabFromParam, type PaperTab } from '@/lib/paper-tabs';
import { canEditPaper, isPaperAuthor } from '@/lib/paper-access';
import type { Paper, PaperMemo, PaperStatus } from '@/types/papers';

function statusVariant(
  status: PaperStatus,
): 'default' | 'secondary' | 'outline' {
  if (status === 'finalised') return 'default';
  if (status === 'archived') return 'outline';
  return 'secondary';
}

export default function PaperDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<PaperTab>(() => paperTabFromParam(searchParams.get('tab')));
  const focusClassId = tab === 'marking' ? searchParams.get('classId') ?? undefined : undefined;

  const changeTab = (value: unknown): void => {
    const next = paperTabFromParam(typeof value === 'string' ? value : null);
    setTab(next);
    const query = new URLSearchParams({ tab: next });
    const classId = searchParams.get('classId');
    if (next === 'marking' && classId) query.set('classId', classId);
    router.replace(`/teacher/papers/${id}?${query.toString()}`, { scroll: false });
  };
  const {
    getPaperById,
    getMemoByPaperId,
    buildMemo,
    finalisePaper,
    downloadPaperPdf,
    downloadMemoPdf,
  } = useTeacherPapers(false);
  const { submitForModeration, submitting } = usePaperModeration();
  const user = useAuthStore((s) => s.user);
  const permissions = useAuthStore((s) => s.permissions);
  const [paper, setPaper] = useState<Paper | null>(null);
  const [memo, setMemo] = useState<PaperMemo | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async (): Promise<void> => {
    const [p, m] = await Promise.all([
      getPaperById(id),
      getMemoByPaperId(id),
    ]);
    setPaper(p);
    setMemo(m);
  }, [id, getPaperById, getMemoByPaperId]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getPaperById(id), getMemoByPaperId(id)])
      .then(([p, m]) => {
        if (!cancelled) {
          setPaper(p);
          setMemo(m);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, getPaperById, getMemoByPaperId]);

  if (loading) return <LoadingSpinner />;
  if (!paper) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/teacher/papers')}
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <p className="text-muted-foreground">Paper not found.</p>
      </div>
    );
  }

  const subject =
    typeof paper.subjectId === 'object' && paper.subjectId
      ? paper.subjectId.name
      : '';
  const grade =
    typeof paper.gradeId === 'object' && paper.gradeId
      ? paper.gradeId.name
      : '';
  const description = [
    subject,
    grade,
    `Term ${paper.term}`,
    `${paper.totalMarks} marks`,
    `${paper.duration} min`,
  ]
    .filter(Boolean)
    .join(' \u00B7 ');

  const handleFinalise = async (): Promise<void> => {
    const result = await finalisePaper(paper._id);
    if (result) setPaper(result);
  };
  // Only the author (or an admin/principal) changes a paper; an HOD reviewing
  // a colleague's paper reads the paper and memo.
  const canEdit = canEditPaper(paper.createdBy, user ? { ...user, isSchoolPrincipal: permissions.isSchoolPrincipal } : null);
  // Independent teachers have no HOD or admin to moderate, so they finalise directly.
  const canFinaliseDirectly = canEdit && !!(
    user?.role === 'admin' ||
    user?.role === 'school_admin' ||
    user?.role === 'super_admin' ||
    permissions.isSchoolPrincipal ||
    user?.isStandaloneTeacher === true
  );
  const shownTab: PaperTab = canEdit || tab === 'memo' ? tab : 'paper';
  const isAuthor = isPaperAuthor(paper.createdBy, user?.id);
  const review = moderationChip(paper.moderation, { isAuthor });
  const withHod = paper.moderation?.status === 'pending';
  const changesAsked = paper.moderation?.status === 'changes_requested';

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push('/teacher/papers')}
      >
        <ChevronLeft className="h-4 w-4 mr-1" /> Back
      </Button>

      <PageHeader title={paper.title} description={description}>
        <div className="flex gap-2 flex-wrap items-center">
          <Badge variant={statusVariant(paper.status)}>{paper.status}</Badge>
          {review ? <StatusChip status={review.status} label={review.label} /> : null}
          {paper.status === 'draft' && canFinaliseDirectly && (
            <Button size="sm" onClick={handleFinalise}>
              <CheckCircle className="h-4 w-4 mr-1" /> Finalise
            </Button>
          )}
          {paper.status === 'draft' && canEdit && !canFinaliseDirectly && !withHod && (
            <Button
              size="sm"
              onClick={() => void submitForModeration(paper._id).then(() => reload())}
              disabled={submitting}
            >
              <ShieldCheck className="h-4 w-4 mr-1" />
              {submitting ? 'Submitting…' : changesAsked ? 'Resubmit for moderation' : 'Submit for moderation'}
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => void downloadPaperPdf(paper._id)}
          >
            <Download className="h-4 w-4 mr-1" /> Paper PDF
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void downloadMemoPdf(paper._id)}
          >
            <FileText className="h-4 w-4 mr-1" /> Memo PDF
          </Button>
        </div>
      </PageHeader>

      {changesAsked && paper.moderation?.comments ? (
        <div role="note" className="rounded-lg border border-attention bg-attention-soft px-4 py-3 text-sm">
          <p className="font-medium text-attention">{isAuthor ? 'Your HOD asked for changes' : 'Changes asked of the author'}</p>
          <p className="mt-1 whitespace-pre-line text-foreground">{paper.moderation.comments}</p>
        </div>
      ) : null}

      <Tabs value={shownTab} onValueChange={changeTab}>
        <TabsList>
          <TabsTrigger value="paper">Paper</TabsTrigger>
          <TabsTrigger value="memo">Memo</TabsTrigger>
          {canEdit ? <TabsTrigger value="assignments">Assign</TabsTrigger> : null}
          {canEdit ? <TabsTrigger value="marking">Marking</TabsTrigger> : null}
        </TabsList>
        <TabsContent value="paper">
          <PaperDetailPaperTab paper={paper} onChanged={reload} readOnly={!canEdit} />
        </TabsContent>
        <TabsContent value="memo">
          {memo ? (
            <PaperDetailMemoTab
              key={memo.updatedAt}
              paper={paper}
              memo={memo}
              onChanged={reload}
              readOnly={!canEdit}
            />
          ) : (
            <EmptyState
              icon={FileText}
              title="No memo yet"
              description={!canEdit
                ? "The paper's author hasn't added a memo yet."
                : paper.status === 'finalised'
                  ? "This paper was finalised without a memo. Build one from its model answers; it's final straight away."
                  : "Build one from this paper's model answers, then check and edit the expected answers."}
              action={!canEdit ? undefined : (
                <Button onClick={() => void buildMemo(paper._id).then((m) => { if (m) setMemo(m); })} className="min-h-11 sm:min-h-9">
                  Build memo from model answers
                </Button>
              )}
            />
          )}
        </TabsContent>
        {canEdit ? (
          <TabsContent value="assignments">
            <PaperDetailAssignmentsTab paper={paper} />
          </TabsContent>
        ) : null}
        {canEdit ? (
          <TabsContent value="marking">
            <PaperDetailMarkingTab paper={paper} focusClassId={focusClassId} />
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}
