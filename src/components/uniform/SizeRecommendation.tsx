'use client';

import { useEffect } from 'react';
import { Ruler } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useSizeRecommendation } from '@/hooks/useSizeRecommendation';

interface SizeRecommendationProps {
  studentId: string;
}

export function SizeRecommendation({ studentId }: SizeRecommendationProps) {
  const { recommendation, loading, fetchRecommendation } = useSizeRecommendation();

  useEffect(() => {
    if (studentId) {
      fetchRecommendation(studentId);
    }
  }, [studentId, fetchRecommendation]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Ruler className="h-4 w-4 animate-pulse" />
        Loading size recommendation...
      </div>
    );
  }

  if (!recommendation) return null;

  return (
    <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
      <Ruler className="h-4 w-4 text-primary shrink-0" />
      <div className="text-sm">
        <span className="text-muted-foreground">Recommended size for </span>
        <span className="font-medium">{recommendation.gradeName || 'this student'}</span>
        <span className="text-muted-foreground">: </span>
        <Badge variant="secondary" className="ml-1">
          {recommendation.recommendedSize}
        </Badge>
      </div>
    </div>
  );
}
