'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  FileText, ArrowLeft, Trash2, Eye, Calendar, Clock,
  Plus, Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@/lib/constants';
import { useAITools } from '@/hooks/useAITools';
import { PaperStatusBadge } from '@/components/ai-tools/PaperStatusBadge';

const subjects = [
  '', 'Mathematics', 'Physical Sciences', 'Life Sciences', 'English',
  'Geography', 'History', 'Accounting', 'Business Studies',
];

export default function PapersLibraryPage() {
  const router = useRouter();
  const { papers, loading, loadPapers, deletePaper } = useAITools();
  const [filterSubject, setFilterSubject] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const fetchPapers = useCallback(() => {
    const filters: { subject?: string; grade?: number; status?: string } = {};
    if (filterSubject) filters.subject = filterSubject;
    if (filterGrade) filters.grade = Number(filterGrade);
    if (filterStatus) filters.status = filterStatus;
    loadPapers(filters);
  }, [loadPapers, filterSubject, filterGrade, filterStatus]);

  useEffect(() => {
    fetchPapers();
  }, [fetchPapers]);

  const handleDelete = async (id: string) => {
    await deletePaper(id);
  };

  const handleViewPaper = (id: string) => {
    router.push(`/teacher/ai-tools/papers/${id}`);
  };

  const readyCount = papers.filter(p => p.status === 'ready').length;
  const editedCount = papers.filter(p => p.status === 'edited').length;

  return (
    <div className="space-y-6">
      <PageHeader title="Paper Library" description="View and manage your generated papers">
        <div className="flex gap-2">
          <Link href={ROUTES.TEACHER_AI_TOOLS}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          </Link>
          <Link href={ROUTES.TEACHER_AI_CREATE_PAPER}>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" /> Create Paper
            </Button>
          </Link>
        </div>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterSubject} onValueChange={(v: unknown) => setFilterSubject((v as string) === 'all' ? '' : ((v as string) ?? ''))}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Subjects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {subjects.filter(Boolean).map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterGrade} onValueChange={(v: unknown) => setFilterGrade((v as string) === 'all' ? '' : ((v as string) ?? ''))}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All Grades" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Grades</SelectItem>
            {Array.from({ length: 12 }, (_, i) => (
              <SelectItem key={i + 1} value={String(i + 1)}>Grade {i + 1}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={(v: unknown) => setFilterStatus((v as string) === 'all' ? '' : ((v as string) ?? ''))}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="ready">Ready</SelectItem>
            <SelectItem value="edited">Edited</SelectItem>
            <SelectItem value="generating">Generating</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Bar */}
      <div className="flex gap-3 text-sm text-muted-foreground">
        <span>{papers.length} papers total</span>
        <span>-</span>
        <span>{readyCount} ready</span>
        <span>-</span>
        <span>{editedCount} edited</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-3">
          {papers.map(paper => (
            <Card key={paper.id} className="transition-colors hover:bg-muted/30">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{paper.subject}</h3>
                      <PaperStatusBadge status={paper.status} />
                      <Badge variant="outline" className="capitalize">{paper.difficulty}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Grade {paper.grade} -- {paper.topic} -- Term {paper.term}
                    </p>
                    <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {new Date(paper.createdAt).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {paper.duration} min
                      </span>
                      <span>{paper.totalMarks} marks</span>
                      <span>
                        {paper.sections.reduce((sum, s) => sum + s.questions.length, 0)} questions
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="sm" title="View" onClick={() => handleViewPaper(paper.id)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(paper.id)}
                      title="Delete"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && papers.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <FileText className="h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">No Papers Yet</h3>
            <p className="text-sm text-muted-foreground">Create your first paper with AI to get started.</p>
            <Link href={ROUTES.TEACHER_AI_CREATE_PAPER}>
              <Button><Plus className="mr-2 h-4 w-4" /> Create Paper</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
