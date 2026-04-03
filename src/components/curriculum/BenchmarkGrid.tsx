'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EmptyState } from '@/components/shared/EmptyState';
import { BarChart3, Pencil, Check, X } from 'lucide-react';
import type { NationalBenchmark, CreateBenchmarkPayload } from '@/types';

interface BenchmarkGridProps {
  benchmarks: NationalBenchmark[];
  onSave: (data: CreateBenchmarkPayload) => Promise<void>;
}

interface EditState {
  targetPassRate: string;
  source: string;
}

function BenchmarkCard({
  benchmark,
  onSave,
}: {
  benchmark: NationalBenchmark;
  onSave: (data: CreateBenchmarkPayload) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [edit, setEdit] = useState<EditState>({
    targetPassRate: String(benchmark.targetPassRate),
    source: benchmark.source ?? '',
  });

  const handleSave = async () => {
    const rate = parseFloat(edit.targetPassRate);
    if (isNaN(rate) || rate < 0 || rate > 100) return;
    setSaving(true);
    try {
      await onSave({
        subjectId: benchmark.subjectId.id,
        gradeId: benchmark.gradeId.id,
        year: benchmark.year,
        targetPassRate: rate,
        source: edit.source || undefined,
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEdit({
      targetPassRate: String(benchmark.targetPassRate),
      source: benchmark.source ?? '',
    });
    setEditing(false);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-sm truncate">{benchmark.subjectId.name}</CardTitle>
            <p className="text-xs text-muted-foreground truncate">
              {benchmark.gradeId.name} &middot; {benchmark.year}
            </p>
          </div>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
              aria-label="Edit benchmark"
            >
              <Pencil size={15} />
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {editing ? (
          <>
            <div className="space-y-1">
              <Label htmlFor={`rate-${benchmark.id}`} className="text-xs">
                Target Pass Rate (%) <span className="text-destructive">*</span>
              </Label>
              <Input
                id={`rate-${benchmark.id}`}
                type="number"
                min={0}
                max={100}
                value={edit.targetPassRate}
                onChange={(e) => setEdit((s) => ({ ...s, targetPassRate: e.target.value }))}
                className="h-8 text-sm w-full"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`src-${benchmark.id}`} className="text-xs">
                Source
              </Label>
              <Input
                id={`src-${benchmark.id}`}
                value={edit.source}
                onChange={(e) => setEdit((s) => ({ ...s, source: e.target.value }))}
                placeholder="e.g. DBE National"
                className="h-8 text-sm w-full"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={saving} className="flex-1">
                <Check size={13} className="mr-1" />
                {saving ? 'Saving...' : 'Save'}
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel} disabled={saving}>
                <X size={13} />
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Target Pass Rate</span>
              <span className="text-lg font-bold">{benchmark.targetPassRate}%</span>
            </div>
            {benchmark.source && (
              <p className="text-xs text-muted-foreground truncate">
                Source: {benchmark.source}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function BenchmarkGrid({ benchmarks, onSave }: BenchmarkGridProps) {
  if (benchmarks.length === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No benchmarks configured"
        description="Add national benchmarks to compare your school's performance."
      />
    );
  }

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {benchmarks.map((benchmark) => (
        <BenchmarkCard key={benchmark.id} benchmark={benchmark} onSave={onSave} />
      ))}
    </div>
  );
}
