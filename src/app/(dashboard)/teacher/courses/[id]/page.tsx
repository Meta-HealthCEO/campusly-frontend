'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AlertTriangle, BarChart3, CheckCircle2, ChevronLeft, Copy, RefreshCw, Send, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { UnitHeader } from '@/components/courses/unit/UnitHeader';
import { UnitOutline } from '@/components/courses/unit/UnitOutline';
import { UnitSteps } from '@/components/courses/unit/UnitSteps';
import { UnitGenerationBanner } from '@/components/courses/unit/UnitGenerationBanner';
import { UnitItemPreview } from '@/components/courses/unit/UnitItemPreview';
import { ReleaseUnitDialog } from '@/components/courses/unit/ReleaseUnitDialog';
import { UnitInsight } from '@/components/courses/unit/UnitInsight';
import { UnitSettings } from '@/components/courses/unit/UnitSettings';
import { CopyUnitDialog } from '@/components/courses/unit/CopyUnitDialog';
import { useCopyUnit } from '@/hooks/useCopyUnit';
import { useUnitInsight } from '@/hooks/useUnitInsight';
import { useUnitView } from '@/hooks/useUnitView';
import { useTeacherClasses } from '@/hooks/useTeacherClasses';
import { resolveId } from '@/lib/api-helpers';
import { canViewUnitInsight, releaseBlocker, showHandBuiltDraftOffer } from '@/lib/course-unit';
import { useAuthStore } from '@/stores/useAuthStore';
import { copyClassOptions } from '@/lib/unit-library';
import { ROUTES } from '@/lib/routes';
import type { PopulatedId } from '@/types';

export default function UnitPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;
  const view = useUnitView(courseId);
  const { entries, loading: classesLoading } = useTeacherClasses();
  const [confirmRedraft, setConfirmRedraft] = useState(false);
  const [releaseOpen, setReleaseOpen] = useState(false);
  const { course, stage } = view;
  const user = useAuthStore((s) => s.user);
  const canSeeInsight = !!course && canViewUnitInsight(course.createdBy, user);
  const insight = useUnitInsight(courseId, stage === 'released' && canSeeInsight);
  const copier = useCopyUnit();

  // Catalogue courses keep the course builder.
  useEffect(() => {
    if (course && course.kind !== 'class_unit') router.replace(ROUTES.TEACHER_COURSE_EDIT(courseId));
  }, [course, courseId, router]);

  const classOptions = useMemo(() => {
    const seen = new Map<string, { id: string; name: string; learners: number }>();
    for (const e of entries) {
      const id = resolveId(e.class as unknown as PopulatedId);
      if (id && !seen.has(id)) seen.set(id, { id, name: e.class.name, learners: e.students.length });
    }
    return [...seen.values()];
  }, [entries]);
  const copyClasses = useMemo(() => copyClassOptions(entries), [entries]);

  if (view.loading) return <LoadingSpinner />;
  if (!course) {
    return <EmptyState icon={AlertTriangle} title="Unit not found" description="It may have been deleted, or it belongs to another teacher." />;
  }

  const blocker = releaseBlocker(course);
  const releasedTo = classOptions.filter((c) => course.scope?.classIds.includes(c.id));
  const hasOutline = course.modules.length > 0;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.push('/teacher/courses')}>
        <ChevronLeft className="mr-1 h-4 w-4" /> Courses
      </Button>

      <UnitHeader course={course}>
        {stage === 'outline' && course.outlineStatus === 'drafted' ? (
          <>
            <Button variant="outline" onClick={() => setConfirmRedraft(true)} disabled={view.busy !== null} className="min-h-11 gap-1.5 sm:min-h-9">
              <RefreshCw className="h-4 w-4" aria-hidden /> Redraft
            </Button>
            <Button onClick={() => void view.approve()} disabled={view.busy !== null} className="min-h-11 gap-1.5 sm:min-h-9">
              <Sparkles className="h-4 w-4" aria-hidden /> {view.busy === 'approve' ? 'Approving…' : 'Approve and write the items'}
            </Button>
          </>
        ) : null}
        {stage === 'release' ? (
          <Button onClick={() => setReleaseOpen(true)} disabled={blocker !== null} title={blocker ?? undefined} className="min-h-11 gap-1.5 sm:min-h-9">
            <Send className="h-4 w-4" aria-hidden /> Release to class
          </Button>
        ) : null}
        {stage === 'release' || stage === 'released' ? (
          <Button
            variant="outline"
            onClick={() => copier.start({ courseId, title: course.title, gradeId: course.scope?.gradeId ?? null, gradeName: '', termNumber: course.scope?.termNumber ?? 1 })}
            className="min-h-11 gap-1.5 sm:min-h-9"
          >
            <Copy className="h-4 w-4" aria-hidden /> Copy to a class
          </Button>
        ) : null}
        {stage === 'released' ? (
          <Button variant="outline" onClick={() => router.push(`/teacher/courses/${courseId}/analytics`)} className="min-h-11 gap-1.5 sm:min-h-9">
            <BarChart3 className="h-4 w-4" aria-hidden /> See progress
          </Button>
        ) : null}
      </UnitHeader>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0 space-y-4">
          {stage === 'released' ? (
            <p role="status" className="flex items-center gap-2 rounded-xl border border-success/30 bg-success-soft px-4 py-3 text-sm text-success">
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              Released to {releasedTo.length > 0 ? releasedTo.map((c) => c.name).join(', ') : 'your class'}. Learners can start on any phone.
            </p>
          ) : null}
          {stage === 'released' && canSeeInsight ? (
            <UnitInsight
              insight={insight.insight}
              error={insight.error}
              revision={{
                busyItemId: typeof view.busy === 'string' && view.busy.startsWith('revision-') ? view.busy.slice('revision-'.length) : null,
                error: view.revisionError,
                onAdd: (t) => void view.addRevision(t).then((ok) => { if (ok) insight.refresh(); }),
              }}
            />
          ) : null}
          {stage === 'released' ? <h2 className="pt-2 text-lg font-semibold">The unit</h2> : null}
          {stage === 'writing' || stage === 'release' ? <UnitGenerationBanner generation={course.generation} /> : null}
          {stage === 'release' && blocker ? <p className="text-sm text-muted-foreground">{blocker}.</p> : null}
          {stage === 'outline' && course.outlineStatus === 'drafted' ? (
            <p className="rounded-xl border border-accent-foreground/20 bg-accent px-4 py-3 text-sm text-accent-foreground">
              Check the outline: remove anything you don&apos;t want, then approve it. Nothing is written until you do.
            </p>
          ) : null}
          {view.draftError ? (
            <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive-soft px-3 py-2 text-sm text-destructive">{view.draftError}</div>
          ) : null}

          {showHandBuiltDraftOffer(course.outlineStatus ?? 'none', hasOutline) ? (
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">This unit&apos;s modules were built by hand. The AI can still draft a CAPS outline from its topics.</p>
              <Button onClick={() => void view.draft()} disabled={view.busy !== null} className="min-h-11 shrink-0 gap-1.5 sm:min-h-9">
                <Sparkles className="h-4 w-4" aria-hidden /> {view.busy === 'draft' ? 'Drafting your outline…' : view.draftError ? 'Try again' : 'Draft the outline'}
              </Button>
            </div>
          ) : null}
          {hasOutline ? (
            <UnitOutline
              course={course}
              outlineStage={stage === 'outline'}
              busyItemId={typeof view.busy === 'string' && !['draft', 'approve', 'release'].includes(view.busy) ? view.busy : null}
              onOpen={(item) => void view.open(item)}
              onRetry={(item) => void view.retry(item)}
              onRemove={(item) => void view.remove(item)}
            />
          ) : (
            <EmptyState
              icon={Sparkles}
              title="No outline yet"
              description="The AI drafts modules and items from this unit's CAPS topics. You check the outline before anything is written."
              action={(
                <Button onClick={() => void view.draft()} disabled={view.busy !== null} className="gap-1.5">
                  <Sparkles className="h-4 w-4" aria-hidden /> {view.busy === 'draft' ? 'Drafting your outline…' : view.draftError ? 'Try again' : 'Draft the outline'}
                </Button>
              )}
            />
          )}
        </div>
        <aside className="space-y-4">
          <UnitSteps current={stage ?? 'outline'} />
          {hasOutline ? <UnitSettings sequential={course.sequential !== false} saving={view.busy === 'settings'} onChange={(on) => void view.setSequential(on)} /> : null}
          {stage !== 'writing' && stage !== 'released' ? (
            <p className="text-xs text-muted-foreground">
              Want to add your own items? <Link href={ROUTES.TEACHER_COURSE_EDIT(courseId)} className="underline underline-offset-2">Open the course builder</Link>, then release from here.
            </p>
          ) : null}
        </aside>
      </div>

      <UnitItemPreview
        open={view.previewOpen}
        onOpenChange={view.setPreviewOpen}
        item={view.openItem}
        preview={view.preview}
        loading={view.previewLoading}
        loadError={view.previewError}
        onRetryLoad={view.retryPreview}
        busy={view.editBusy}
        blocked={view.otherBusy}
        error={view.editError}
        onSave={view.saveItem}
        onRewrite={view.rewriteItem}
      />
      <ConfirmDialog
        open={confirmRedraft}
        onOpenChange={setConfirmRedraft}
        title="Redraft the outline?"
        description="The AI writes a new outline from the same CAPS topics. This one, and any items you removed, is replaced."
        confirmLabel="Redraft"
        onConfirm={async () => { await view.draft(); }}
      />
      {copier.target ? (
        <CopyUnitDialog
          open
          onOpenChange={(o) => { if (!o) copier.close(); }}
          source={copier.target}
          classes={copyClasses}
          classesLoading={classesLoading}
          copying={copier.copying}
          error={copier.error}
          onCopy={(input) => void copier.copy(input)}
        />
      ) : null}
      {releaseOpen ? (
        <ReleaseUnitDialog
          open={releaseOpen}
          onOpenChange={setReleaseOpen}
          classes={classOptions}
          defaultClassIds={course.scope?.classIds ?? []}
          releasing={view.busy === 'release'}
          onRelease={(ids) => void view.release(ids).then((ok) => { if (ok) setReleaseOpen(false); })}
        />
      ) : null}
    </div>
  );
}
