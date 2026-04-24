'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { Eye, Send, ClipboardList } from 'lucide-react';
import type { PaperMarking } from '@/hooks/useTeacherMarking';
import { PublishToGradebookDialog } from './PublishToGradebookDialog';

interface MarkingHistoryTableProps {
  markings: PaperMarking[];
  onViewMarking: (id: string) => void;
  onPublish: (id: string, assessmentId: string, comment?: string) => Promise<void>;
  onBack: () => void;
}

function statusVariant(status: PaperMarking['status']) {
  switch (status) {
    case 'published':
      return 'default' as const;
    case 'completed':
      return 'secondary' as const;
    case 'processing':
      return 'outline' as const;
    case 'failed':
      return 'destructive' as const;
    default:
      return 'outline' as const;
  }
}

export function MarkingHistoryTable({
  markings,
  onViewMarking,
  onPublish,
  onBack,
}: MarkingHistoryTableProps) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  const pendingMarking = markings.find((m) => m.id === pendingId) ?? null;

  if (markings.length === 0) {
    return (
      <div className="space-y-4">
        <EmptyState
          icon={ClipboardList}
          title="No markings yet"
          description="Mark a student paper to see results here."
        />
        <Button variant="outline" onClick={onBack}>
          Back to marking
        </Button>
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">All Results</CardTitle>
            <Button variant="outline" size="sm" onClick={onBack}>
              Back to marking
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 pr-4 font-medium">Student</th>
                  <th className="pb-2 pr-4 font-medium">Total</th>
                  <th className="pb-2 pr-4 font-medium">%</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {markings.map((m) => (
                  <tr key={m.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 truncate max-w-50">{m.studentName}</td>
                    <td className="py-2 pr-4">
                      {m.totalMarks}/{m.maxMarks}
                    </td>
                    <td className="py-2 pr-4">{m.percentage}%</td>
                    <td className="py-2 pr-4">
                      <Badge variant={statusVariant(m.status)} className="capitalize">
                        {m.status}
                      </Badge>
                    </td>
                    <td className="py-2">
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewMarking(m.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {m.status === 'completed' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPendingId(m.id)}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <PublishToGradebookDialog
        open={pendingId !== null}
        onOpenChange={(open) => { if (!open) setPendingId(null); }}
        title="Publish to Gradebook"
        description={pendingMarking ? `Publishing marks for ${pendingMarking.studentName}` : undefined}
        submitting={publishing}
        onConfirm={async (assessmentId, comment) => {
          if (!pendingId) return;
          setPublishing(true);
          await onPublish(pendingId, assessmentId, comment);
          setPublishing(false);
          setPendingId(null);
        }}
      />
    </>
  );
}
