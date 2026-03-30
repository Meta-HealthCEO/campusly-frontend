'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  FileText, ArrowLeft, Copy, Trash2, Eye,
  Calendar, Clock, Plus,
} from 'lucide-react';
import Link from 'next/link';
import { ROUTES } from '@/lib/constants';

interface Paper {
  id: string;
  subject: string;
  grade: number;
  topic: string;
  term: number;
  totalMarks: number;
  duration: number;
  difficulty: string;
  createdDate: string;
  status: 'draft' | 'published' | 'archived';
  questionCount: number;
}

const mockPapers: Paper[] = [
  {
    id: 'p1', subject: 'Physical Sciences', grade: 10, topic: 'Chemical Reactions',
    term: 1, totalMarks: 50, duration: 60, difficulty: 'medium',
    createdDate: '2026-03-28', status: 'published', questionCount: 11,
  },
  {
    id: 'p2', subject: 'Mathematics', grade: 11, topic: 'Quadratic Equations',
    term: 1, totalMarks: 80, duration: 120, difficulty: 'hard',
    createdDate: '2026-03-25', status: 'published', questionCount: 15,
  },
  {
    id: 'p3', subject: 'Geography', grade: 8, topic: 'Climate Zones',
    term: 2, totalMarks: 40, duration: 60, difficulty: 'easy',
    createdDate: '2026-03-20', status: 'draft', questionCount: 8,
  },
  {
    id: 'p4', subject: 'English', grade: 9, topic: 'Essay Writing',
    term: 1, totalMarks: 30, duration: 90, difficulty: 'medium',
    createdDate: '2026-03-15', status: 'archived', questionCount: 5,
  },
  {
    id: 'p5', subject: 'Life Sciences', grade: 12, topic: 'Genetics & Inheritance',
    term: 1, totalMarks: 100, duration: 120, difficulty: 'mixed',
    createdDate: '2026-03-10', status: 'published', questionCount: 18,
  },
];

const statusConfig = {
  draft: { label: 'Draft', variant: 'outline' as const },
  published: { label: 'Published', variant: 'default' as const },
  archived: { label: 'Archived', variant: 'secondary' as const },
};

export default function PapersLibraryPage() {
  const [papers, setPapers] = useState(mockPapers);
  const [previewPaper, setPreviewPaper] = useState<Paper | null>(null);

  const handleDuplicate = (id: string) => {
    const paper = papers.find(p => p.id === id);
    if (!paper) return;
    const duplicate: Paper = {
      ...paper,
      id: `p${Date.now()}`,
      topic: `${paper.topic} (Copy)`,
      createdDate: new Date().toISOString().split('T')[0],
      status: 'draft',
    };
    setPapers([duplicate, ...papers]);
  };

  const handleDelete = (id: string) => {
    setPapers(papers.filter(p => p.id !== id));
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Paper Library" description="View and manage your generated papers">
        <div className="flex gap-2">
          <Link href={ROUTES.TEACHER_AI_TOOLS}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <Link href={ROUTES.TEACHER_AI_CREATE_PAPER}>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Create Paper
            </Button>
          </Link>
        </div>
      </PageHeader>

      {/* Stats Bar */}
      <div className="flex gap-3 text-sm text-muted-foreground">
        <span>{papers.length} papers total</span>
        <span>-</span>
        <span>{papers.filter(p => p.status === 'published').length} published</span>
        <span>-</span>
        <span>{papers.filter(p => p.status === 'draft').length} drafts</span>
      </div>

      {/* Papers List */}
      <div className="space-y-3">
        {papers.map(paper => {
          const config = statusConfig[paper.status];
          return (
            <Card key={paper.id} className="transition-colors hover:bg-muted/30">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{paper.subject}</h3>
                      <Badge variant={config.variant}>{config.label}</Badge>
                      <Badge variant="outline" className="capitalize">{paper.difficulty}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Grade {paper.grade} — {paper.topic} — Term {paper.term}
                    </p>
                    <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {paper.createdDate}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {paper.duration} min
                      </span>
                      <span>{paper.totalMarks} marks</span>
                      <span>{paper.questionCount} questions</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Dialog>
                      <DialogTrigger
                        render={
                          <Button variant="ghost" size="sm" title="View" onClick={() => setPreviewPaper(paper)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                          <DialogTitle>Paper Preview</DialogTitle>
                        </DialogHeader>
                        {previewPaper && (
                          <div className="space-y-4">
                            <div className="text-center space-y-1">
                              <h3 className="text-lg font-bold">{previewPaper.subject}</h3>
                              <p className="text-sm text-muted-foreground">
                                Grade {previewPaper.grade} — Term {previewPaper.term}
                              </p>
                              <p className="text-sm font-medium">{previewPaper.topic}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div className="rounded-lg bg-muted/50 p-3 text-center">
                                <p className="text-muted-foreground">Duration</p>
                                <p className="font-bold">{previewPaper.duration} min</p>
                              </div>
                              <div className="rounded-lg bg-muted/50 p-3 text-center">
                                <p className="text-muted-foreground">Total Marks</p>
                                <p className="font-bold">{previewPaper.totalMarks}</p>
                              </div>
                              <div className="rounded-lg bg-muted/50 p-3 text-center">
                                <p className="text-muted-foreground">Questions</p>
                                <p className="font-bold">{previewPaper.questionCount}</p>
                              </div>
                              <div className="rounded-lg bg-muted/50 p-3 text-center">
                                <p className="text-muted-foreground">Difficulty</p>
                                <p className="font-bold capitalize">{previewPaper.difficulty}</p>
                              </div>
                            </div>
                            <Badge variant={statusConfig[previewPaper.status].variant} className="mx-auto">
                              {statusConfig[previewPaper.status].label}
                            </Badge>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                    <Button variant="ghost" size="sm" onClick={() => handleDuplicate(paper.id)} title="Duplicate">
                      <Copy className="h-4 w-4" />
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
          );
        })}
      </div>

      {papers.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <FileText className="h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">No Papers Yet</h3>
            <p className="text-sm text-muted-foreground">Create your first paper with AI to get started.</p>
            <Link href={ROUTES.TEACHER_AI_CREATE_PAPER}>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Create Paper
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
