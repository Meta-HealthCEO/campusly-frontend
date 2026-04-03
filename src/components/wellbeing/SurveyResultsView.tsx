'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { SurveyResults, QuestionResult } from '@/types';

interface SurveyResultsViewProps {
  results: SurveyResults;
}

function ScaleResult({ result }: { result: QuestionResult }) {
  const dist = result.distribution ?? {};
  const data = Object.entries(dist).map(([k, v]) => ({ label: k, count: v }));

  return (
    <div className="space-y-2">
      <p className="text-sm">
        Average: <span className="font-semibold">{result.averageScore?.toFixed(1)}</span>
      </p>
      {data.length > 0 && (
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={data}>
            <XAxis dataKey="label" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Bar dataKey="count" fill="#2563eb" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function ChoiceResult({ result }: { result: QuestionResult }) {
  const dist = result.distribution ?? {};
  const data = Object.entries(dist).map(([k, v]) => ({ label: k, count: v }));

  return (
    <div className="space-y-2">
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" fontSize={12} />
            <YAxis dataKey="label" type="category" fontSize={12} width={80} />
            <Tooltip />
            <Bar dataKey="count" fill="#10b981" />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-sm text-muted-foreground">No responses</p>
      )}
    </div>
  );
}

function TextResult({ result }: { result: QuestionResult }) {
  return (
    <p className="text-sm text-muted-foreground">
      {result.responseCount ?? 0} text responses received
      {result.responses === null && ' (hidden for anonymous surveys)'}
    </p>
  );
}

export function SurveyResultsView({ results }: SurveyResultsViewProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold">{results.title}</h3>
        <Badge variant="secondary">{results.responseCount} responses</Badge>
      </div>

      {results.questions.map((q) => (
        <Card key={q.questionIndex}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Q{q.questionIndex + 1}: {q.text}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {q.type === 'scale' && <ScaleResult result={q} />}
            {(q.type === 'multiple_choice' || q.type === 'yes_no') && <ChoiceResult result={q} />}
            {q.type === 'text' && <TextResult result={q} />}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
