'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { FileText } from 'lucide-react';
import type { MarkingPaperOption } from '@/hooks/useTeacherMarking';

interface MarkingPaperSelectProps {
  papers: MarkingPaperOption[];
  loading: boolean;
  onSelect: (paper: MarkingPaperOption) => void;
}

export function MarkingPaperSelect({ papers, loading, onSelect }: MarkingPaperSelectProps) {
  const [selectedId, setSelectedId] = useState('');

  const selectedPaper = papers.find((p) => p.id === selectedId) ?? null;

  if (loading) return <LoadingSpinner />;

  if (papers.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No papers available"
        description="Generate an AI paper or create an assessment paper first."
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Select Assessment Paper</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Paper</Label>
          <Select
            value={selectedId || 'placeholder'}
            onValueChange={(v: unknown) => {
              const val = v as string;
              if (val !== 'placeholder') setSelectedId(val);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a paper to mark against..." />
            </SelectTrigger>
            <SelectContent>
              {papers.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedPaper && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
            <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{selectedPaper.title}</p>
              <p className="text-xs text-muted-foreground">
                Total marks: {selectedPaper.maxMarks}
              </p>
            </div>
          </div>
        )}

        <Button
          onClick={() => {
            if (selectedPaper) onSelect(selectedPaper);
          }}
          disabled={!selectedPaper}
        >
          Continue
        </Button>
      </CardContent>
    </Card>
  );
}
