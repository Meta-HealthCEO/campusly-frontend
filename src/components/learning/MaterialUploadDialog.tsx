'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import type { Subject, Grade } from '@/types';
import type { CreateMaterialInput } from './types';

interface MaterialUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjects: Subject[];
  grades: Grade[];
  schoolId: string;
  onSubmit: (data: CreateMaterialInput) => Promise<void>;
}

const materialTypes = [
  { value: 'notes', label: 'Notes' },
  { value: 'video', label: 'Video' },
  { value: 'link', label: 'Link' },
  { value: 'document', label: 'Document' },
  { value: 'past_paper', label: 'Past Paper' },
] as const;

export function MaterialUploadDialog({
  open, onOpenChange, subjects, grades, schoolId, onSubmit,
}: MaterialUploadDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [gradeId, setGradeId] = useState('');
  const [term, setTerm] = useState('1');
  const [topic, setTopic] = useState('');
  const [type, setType] = useState<CreateMaterialInput['type']>('notes');
  const [fileUrl, setFileUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [externalLink, setExternalLink] = useState('');
  const [tags, setTags] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedSubject = subjects.find((s) => s.id === subjectId);
  const selectedGrade = grades.find((g) => g.id === gradeId);

  const resetForm = () => {
    setTitle(''); setDescription(''); setSubjectId(''); setGradeId('');
    setTerm('1'); setTopic(''); setType('notes'); setFileUrl('');
    setVideoUrl(''); setExternalLink(''); setTags('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !subjectId || !gradeId || !topic) return;
    setSubmitting(true);
    try {
      await onSubmit({
        schoolId,
        subjectId,
        gradeId,
        term: Number(term),
        topic,
        type,
        title,
        description: description || undefined,
        fileUrl: fileUrl || undefined,
        videoUrl: videoUrl || undefined,
        externalLink: externalLink || undefined,
        tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        curriculum: {
          subject: selectedSubject?.name ?? '',
          grade: selectedGrade?.name ?? '',
          term: `Term ${term}`,
          topic,
        },
      });
      resetForm();
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Upload Study Material</DialogTitle>
          <DialogDescription>Add notes, videos, or past papers for students.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="matTitle">Title *</Label>
              <Input id="matTitle" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Chapter 5 Notes" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="matDesc">Description</Label>
              <Textarea id="matDesc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description..." rows={2} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Subject *</Label>
                <Select value={subjectId} onValueChange={(v: unknown) => setSubjectId(v as string)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Grade *</Label>
                <Select value={gradeId} onValueChange={(v: unknown) => setGradeId(v as string)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {grades.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Term *</Label>
                <Select value={term} onValueChange={(v: unknown) => setTerm(v as string)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4].map((t) => <SelectItem key={t} value={String(t)}>Term {t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Type *</Label>
                <Select value={type} onValueChange={(v: unknown) => setType(v as CreateMaterialInput['type'])}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {materialTypes.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="matTopic">Topic *</Label>
              <Input id="matTopic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Quadratic Equations" required />
            </div>
            {(type === 'notes' || type === 'document' || type === 'past_paper') && (
              <div className="space-y-2">
                <Label htmlFor="matFileUrl">File URL</Label>
                <Input id="matFileUrl" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} placeholder="https://..." />
              </div>
            )}
            {type === 'video' && (
              <div className="space-y-2">
                <Label htmlFor="matVideoUrl">Video URL</Label>
                <Input id="matVideoUrl" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://..." />
              </div>
            )}
            {type === 'link' && (
              <div className="space-y-2">
                <Label htmlFor="matLinkUrl">External Link</Label>
                <Input id="matLinkUrl" value={externalLink} onChange={(e) => setExternalLink(e.target.value)} placeholder="https://..." />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="matTags">Tags (comma-separated)</Label>
              <Input id="matTags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="algebra, equations" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Uploading...' : 'Upload'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
