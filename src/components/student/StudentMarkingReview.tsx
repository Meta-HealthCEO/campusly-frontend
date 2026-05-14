'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Images } from 'lucide-react';
import { MarkingPagesLightbox } from '@/components/ai-tools/MarkingPagesLightbox';
import { MarkingQuestionCard } from '@/components/ai-tools/MarkingQuestionCard';
import { useStudentMarking } from '@/hooks/useStudentMarking';
import type { StudentMarkingDetail } from '@/hooks/useStudentMarking';

interface StudentMarkingReviewProps {
  marking: StudentMarkingDetail;
}

function percentageBadgeVariant(pct: number) {
  if (pct >= 80) return 'default' as const;
  if (pct >= 50) return 'secondary' as const;
  return 'destructive' as const;
}

export function StudentMarkingReview({ marking }: StudentMarkingReviewProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const { downloadMarkingPdf } = useStudentMarking();
  const hasImages = (marking.images?.length ?? 0) > 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle>{marking.paperTitle}</CardTitle>
              <p className="text-sm text-muted-foreground">{marking.subjectName}</p>
            </div>
            <Badge variant={percentageBadgeVariant(marking.percentage)} className="text-base px-3 py-1">
              {marking.totalMarks} / {marking.maxMarks} ({Math.round(marking.percentage)}%)
            </Badge>
          </div>
          {marking.issuedAt && (
            <p className="text-xs text-muted-foreground mt-2">
              Issued {new Date(marking.issuedAt).toLocaleDateString()}
            </p>
          )}
        </CardHeader>
        {hasImages && (
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLightboxOpen(true)}
                className="gap-2"
              >
                <Images className="h-4 w-4" />
                View marked pages
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => downloadMarkingPdf(marking.id, marking.studentName, marking.paperTitle)}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      <div className="space-y-3">
        {marking.questions.map((q, i) => (
          <MarkingQuestionCard
            key={i}
            question={q}
            index={i}
            editable={false}
            rationaleLabel="Rationale"
          />
        ))}
      </div>

      {hasImages && (
        <MarkingPagesLightbox
          open={lightboxOpen}
          onOpenChange={setLightboxOpen}
          markingId={marking.id}
          images={marking.images ?? []}
        />
      )}
    </div>
  );
}
