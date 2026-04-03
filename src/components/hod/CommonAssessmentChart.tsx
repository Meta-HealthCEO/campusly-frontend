'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { BarChart3 } from 'lucide-react';
import type { CommonAssessmentResult } from '@/types';

interface CommonAssessmentChartProps {
  results: CommonAssessmentResult[];
}

const LEVEL_LABELS = ['L1 (0-29)', 'L2 (30-39)', 'L3 (40-49)', 'L4 (50-59)', 'L5 (60-69)', 'L6 (70-79)', 'L7 (80-100)'];
const LEVEL_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#6366f1'];

export function CommonAssessmentChart({ results }: CommonAssessmentChartProps) {
  if (results.length === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No common assessments"
        description="Common assessment comparisons will appear when parallel classes have the same assessment."
      />
    );
  }

  return (
    <div className="space-y-6">
      {results.map((result) => (
        <Card key={`${result.assessmentName}-${result.subjectName}`}>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <CardTitle className="text-lg truncate">{result.assessmentName}</CardTitle>
              <Badge variant="secondary">{result.subjectName}</Badge>
              <span className="text-sm text-muted-foreground">
                Total: {result.totalMarks} marks
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary cards */}
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {result.classes.map((cls) => (
                <div
                  key={cls.classId}
                  className="rounded-lg border p-3 space-y-1"
                >
                  <p className="font-medium truncate">{cls.className}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {cls.teacherName} ({cls.studentCount} students)
                  </p>
                  <div className="flex flex-wrap gap-2 text-sm">
                    <span>Avg: <strong>{cls.averageMark}%</strong></span>
                    <span>Pass: <strong>{cls.passRate}%</strong></span>
                    <span>Median: <strong>{cls.medianMark}%</strong></span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    SD: {cls.standardDeviation}
                  </p>
                </div>
              ))}
            </div>

            {/* Distribution chart */}
            <DistributionChart classes={result.classes} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function DistributionChart({ classes }: { classes: CommonAssessmentResult['classes'] }) {
  const data = LEVEL_LABELS.map((label, i) => {
    const key = `level${7 - i}` as keyof typeof classes[0]['distribution'];
    const row: Record<string, string | number> = { level: label };
    for (const cls of classes) {
      row[cls.className] = cls.distribution[key];
    }
    return row;
  }).reverse();

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="level" tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Legend />
        {classes.map((cls, i) => (
          <Bar
            key={cls.classId}
            dataKey={cls.className}
            fill={LEVEL_COLORS[i % LEVEL_COLORS.length]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
