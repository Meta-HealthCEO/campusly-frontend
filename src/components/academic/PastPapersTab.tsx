'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Plus, Trash2, FileText, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { extractErrorMessage } from '@/lib/api-helpers';
import { useSubjects, useGrades, usePastPapers } from '@/hooks/useAcademics';
import { usePastPaperMutations } from '@/hooks/useAcademicMutationsExtended';

export function PastPapersTab() {
  const { subjects } = useSubjects();
  const { grades } = useGrades();
  const { papers, loading, refetch: fetchPapers } = usePastPapers();
  const { createPastPaper, deletePastPaper } = usePastPaperMutations();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    subjectId: '', gradeId: '', year: '2025', term: '1', fileUrl: '',
  });

  async function handleSubmit() {
    try {
      await createPastPaper({
        subjectId: form.subjectId,
        gradeId: form.gradeId,
        year: Number(form.year),
        term: Number(form.term),
        fileUrl: form.fileUrl,
      });
      toast.success('Past paper uploaded');
      setDialogOpen(false);
      fetchPapers();
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to upload past paper'));
    }
  }

  async function handleDelete(id: string) {
    try {
      await deletePastPaper(id);
      toast.success('Paper deleted');
      fetchPapers();
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to delete paper'));
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() => {
            setForm({
              subjectId: '',
              gradeId: '',
              year: '2025',
              term: '1',
              fileUrl: '',
            });
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-1 h-4 w-4" /> Upload Past Paper
        </Button>
      </div>

      {papers.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No past papers"
          description="No past papers have been uploaded yet."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {papers.map((paper) => (
            <Card key={paper.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{paper.subjectName}</h4>
                  <Badge variant="outline">
                    {paper.year} T{paper.term}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {paper.gradeName}
                </p>
                {paper.uploadedBy && (
                  <p className="text-xs text-muted-foreground">
                    Uploaded by {paper.uploadedBy}
                  </p>
                )}
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      window.open(paper.fileUrl, '_blank', 'noopener')
                    }
                  >
                    <ExternalLink className="mr-1 h-3 w-3" /> View
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDelete(paper.id)}
                    aria-label="Delete paper"
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Past Paper</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Subject</Label>
              <Select
                value={form.subjectId}
                onValueChange={(v: unknown) =>
                  setForm((f) => ({ ...f, subjectId: v as string }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Grade</Label>
              <Select
                value={form.gradeId}
                onValueChange={(v: unknown) =>
                  setForm((f) => ({ ...f, gradeId: v as string }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  {grades.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Year</Label>
                <Input
                  type="number"
                  min={2000}
                  value={form.year}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, year: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Term</Label>
                <Input
                  type="number"
                  min={1}
                  max={4}
                  value={form.term}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, term: e.target.value }))
                  }
                />
              </div>
            </div>
            <div>
              <Label>File URL</Label>
              <Input
                value={form.fileUrl}
                onChange={(e) =>
                  setForm((f) => ({ ...f, fileUrl: e.target.value }))
                }
                placeholder="https://storage.example.com/papers/..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleSubmit}
              disabled={
                !form.subjectId || !form.gradeId || !form.fileUrl
              }
            >
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
