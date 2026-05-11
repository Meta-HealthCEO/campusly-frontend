'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { PaperDetailPaperTab } from '@/components/papers/PaperDetailPaperTab';
import { PaperDetailMemoTab } from '@/components/papers/PaperDetailMemoTab';
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
  const {
    getPaperById,
    getMemoByPaperId,
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
  const canFinaliseDirectly = !!(
    user?.role === 'school_admin' ||
    user?.role === 'super_admin' ||
    permissions.isSchoolPrincipal
  );

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
          {paper.status === 'draft' && canFinaliseDirectly && (
            <Button size="sm" onClick={handleFinalise}>
              <CheckCircle className="h-4 w-4 mr-1" /> Finalise
            </Button>
          )}
          {paper.status === 'draft' && !canFinaliseDirectly && (
            <Button
              size="sm"
              onClick={() => void submitForModeration(paper._id)}
              disabled={submitting}
            >
              <ShieldCheck className="h-4 w-4 mr-1" />
              {submitting ? 'Submitting...' : 'Submit for Moderation'}
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

      <Tabs defaultValue="paper">
        <TabsList>
          <TabsTrigger value="paper">Paper</TabsTrigger>
          <TabsTrigger value="memo">Memo</TabsTrigger>
        </TabsList>
        <TabsContent value="paper">
          <PaperDetailPaperTab paper={paper} onChanged={reload} />
        </TabsContent>
        <TabsContent value="memo">
          {memo ? (
            <PaperDetailMemoTab
              key={memo.updatedAt}
              paper={paper}
              memo={memo}
              onChanged={reload}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Memo not available yet.
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
