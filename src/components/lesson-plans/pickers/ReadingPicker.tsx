'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BookOpen, ExternalLink } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { useContentResourceLibrary } from '@/hooks/useContentResourceLibrary';
import type { StagedReadingHomework } from '@/types';

interface ReadingPickerProps {
  classId: string;
  subjectId: string;
  schoolId: string;
  initialTitle?: string;
  onPicked: (hw: StagedReadingHomework) => void;
}

export function ReadingPicker({
  classId,
  subjectId,
  schoolId,
  initialTitle,
  onPicked,
}: ReadingPickerProps) {
  const [search, setSearch] = useState<string>('');
  const { resources, loading } = useContentResourceLibrary({
    classId,
    subjectId,
    q: search,
  });
  const [selectedId, setSelectedId] = useState<string>('');
  const [title, setTitle] = useState<string>(initialTitle ?? '');
  const [pageRange, setPageRange] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');

  const selected = resources.find((r) => r._id === selectedId);
  const canSubmit = Boolean(selectedId && title.trim() && dueDate);

  const handleSubmit = (): void => {
    if (!selected) return;
    const hw: StagedReadingHomework = {
      type: 'reading',
      contentResourceId: selected._id,
      title: title.trim(),
      schoolId,
      subjectId,
      classId,
      dueDate: new Date(dueDate).toISOString(),
      totalMarks: 0,
    };
    if (pageRange.trim()) hw.pageRange = pageRange.trim();
    onPicked(hw);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="reading-hw-search">Search Content Library</Label>
        <Input
          id="reading-hw-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="e.g. Fractions Chapter 3"
        />
      </div>

      {loading && (
        <p className="text-sm text-muted-foreground">Loading resources...</p>
      )}

      {!loading && resources.length === 0 && (
        <div className="text-center py-6 space-y-3 border border-dashed rounded-md">
          <BookOpen className="h-8 w-8 text-muted-foreground mx-auto" />
          <div className="space-y-1">
            <p className="font-medium text-sm">No resources found</p>
            <p className="text-xs text-muted-foreground">
              {search.trim()
                ? 'Try a different search term, or add a resource to the Content Library.'
                : 'Add study notes, worksheets, or lessons in the Content Library.'}
            </p>
          </div>
          <Link
            href="/teacher/curriculum/content"
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Add a resource <ExternalLink className="ml-1 h-3 w-3" />
          </Link>
        </div>
      )}

      {resources.length > 0 && (
        <div className="space-y-2">
          <Label>
            Resource <span className="text-destructive">*</span>
          </Label>
          <div className="max-h-48 overflow-y-auto rounded-md border">
            {resources.map((r) => (
              <button
                type="button"
                key={r._id}
                onClick={() => setSelectedId(r._id)}
                className={`w-full text-left px-3 py-2 hover:bg-muted ${
                  selectedId === r._id ? 'bg-muted' : ''
                }`}
              >
                <div className="font-medium truncate">{r.title}</div>
                <div className="text-xs text-muted-foreground capitalize">
                  {r.type.replace(/_/g, ' ')}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="reading-hw-title">
          Homework Title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="reading-hw-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Read pp. 40-45"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="reading-hw-pages">Page Range (optional)</Label>
        <Input
          id="reading-hw-pages"
          value={pageRange}
          onChange={(e) => setPageRange(e.target.value)}
          placeholder="40-45"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="reading-hw-due">
          Due Date <span className="text-destructive">*</span>
        </Label>
        <Input
          id="reading-hw-due"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </div>

      <Button type="button" onClick={handleSubmit} disabled={!canSubmit}>
        Add Reading Homework
      </Button>
    </div>
  );
}
