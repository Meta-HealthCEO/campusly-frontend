'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { useLessonWorkspaceStore } from '@/stores/useLessonWorkspaceStore';
import { usePapersPicker } from '@/hooks/useLessonResourcePickers';

type Mode = 'link' | 'create';

interface Props {
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}

export function PaperDrawer({ onSubmit }: Props) {
  const closeDrawer = useLessonWorkspaceStore((s) => s.closeDrawer);
  const { items, loading: itemsLoading } = usePapersPicker();

  const [mode, setMode] = useState<Mode>('link');
  const [title, setTitle] = useState('');
  const [teacherNotes, setTeacherNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [existingPaperId, setExistingPaperId] = useState('');

  const linkSelected = useMemo(
    () => items.find((p) => p.id === existingPaperId) ?? null,
    [items, existingPaperId],
  );

  const handleLinkChange = (val: string | null) => {
    const next = val ?? '';
    setExistingPaperId(next);
    const p = items.find((x) => x.id === next);
    if (p && !title.trim()) setTitle(p.title);
  };

  const linkValid = !!existingPaperId && !!title.trim();
  // Mode B is intentionally disabled — see notice in TabsContent below.
  const canSubmit = !submitting && mode === 'link' && linkValid;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onSubmit({
        kind: 'paper',
        title: title.trim(),
        teacherNotes: teacherNotes.trim() || undefined,
        existingPaperId,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Tabs
        defaultValue="link"
        onValueChange={(v: unknown) => setMode((v as Mode) ?? 'link')}
      >
        <TabsList className="w-full">
          <TabsTrigger value="link">Link existing</TabsTrigger>
          <TabsTrigger value="create">Create new</TabsTrigger>
        </TabsList>

        <TabsContent value="link" className="pt-4 space-y-4">
          {itemsLoading ? (
            <LoadingSpinner />
          ) : items.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No papers available"
              description="Generate or create a paper in the Papers module first, then link it here."
              action={
                <Link href="/teacher/papers/new">
                  <Button>Create paper</Button>
                </Link>
              }
            />
          ) : (
            <div>
              <Label htmlFor="paper-pick">
                Paper <span className="text-destructive">*</span>
              </Label>
              <Select value={existingPaperId} onValueChange={handleLinkChange}>
                <SelectTrigger id="paper-pick" className="w-full">
                  <SelectValue placeholder="Select a paper to link" />
                </SelectTrigger>
                <SelectContent>
                  {items.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex flex-col">
                        <span className="truncate">{p.title}</span>
                        <span className="text-xs text-muted-foreground truncate">
                          {p.subtitle}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {linkSelected && (
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {linkSelected.subtitle}
                </p>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="create" className="pt-4 space-y-4">
          <div className="flex gap-2 items-start bg-muted/40 border rounded-md p-3 text-sm">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
            <div className="text-xs text-muted-foreground">
              Generating papers from the workspace is coming soon. For now,
              please create a paper separately and link it here.{' '}
              <Link href="/teacher/papers/new" className="underline">
                Open the paper builder
              </Link>
              .
            </div>
          </div>
          <fieldset disabled className="opacity-60 space-y-3">
            <div>
              <Label htmlFor="paper-type">Paper type</Label>
              <Select disabled>
                <SelectTrigger id="paper-type" className="w-full">
                  <SelectValue placeholder="Class test" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="class_test">Class test</SelectItem>
                  <SelectItem value="assignment">Assignment</SelectItem>
                  <SelectItem value="mid_year">Mid-year</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="final">Final</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              <div>
                <Label htmlFor="paper-sections">Sections</Label>
                <Input id="paper-sections" type="number" min={1} max={10} className="w-full" />
              </div>
              <div>
                <Label htmlFor="paper-marks">Total marks</Label>
                <Input id="paper-marks" type="number" min={1} max={500} className="w-full" />
              </div>
            </div>
          </fieldset>
        </TabsContent>
      </Tabs>

      <div>
        <Label htmlFor="paper-title">
          Title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="paper-title"
          className="w-full"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="How this paper appears in the lesson"
        />
      </div>

      <div>
        <Label htmlFor="paper-notes">Teacher notes</Label>
        <Textarea
          id="paper-notes"
          className="w-full min-h-20"
          value={teacherNotes}
          onChange={(e) => setTeacherNotes(e.target.value)}
          placeholder="Anything learners should know?"
        />
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t">
        <Button type="button" variant="outline" onClick={closeDrawer} disabled={submitting}>
          Cancel
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={!canSubmit}>
          {submitting ? 'Saving\u2026' : 'Link paper'}
        </Button>
      </div>
    </div>
  );
}
