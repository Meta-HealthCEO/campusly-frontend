'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AIInsightCard } from './AIInsightCard';
import type { AIPerformanceReport } from '@/types/ai-sports';

interface AIReportViewProps {
  report: AIPerformanceReport;
}

function formatReportType(type: string): string {
  return type
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function AIReportView({ report }: AIReportViewProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg">{formatReportType(report.reportType)}</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{report.sportCode}</Badge>
              <span className="text-sm text-muted-foreground">{formatDate(report.createdAt)}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
            {report.content}
          </div>
        </CardContent>
      </Card>

      {report.insights.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold">Key Insights</h3>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
            {report.insights.map((insight, idx) => (
              <AIInsightCard key={idx} insight={insight} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
