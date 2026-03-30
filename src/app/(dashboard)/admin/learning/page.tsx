'use client';

import { useState } from 'react';
import {
  Plus, BookOpen, FileQuestion, BarChart3, ClipboardList,
  Upload, Video, FileText, CheckCircle2, Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { formatDate } from '@/lib/utils';

// ============== Types & Mock Data ==============

interface StudyMaterial {
  id: string;
  title: string;
  subject: string;
  grade: string;
  type: 'notes' | 'video' | 'past_paper';
  uploadDate: string;
  uploadedBy: string;
  downloads: number;
}

interface Quiz {
  id: string;
  title: string;
  subject: string;
  className: string;
  questionCount: number;
  questionType: 'mcq' | 'true_false' | 'mixed';
  timeLimit: number;
  totalPoints: number;
  status: 'draft' | 'published' | 'closed';
  attempts: number;
  avgScore: number;
}

interface QuizResult {
  id: string;
  quizTitle: string;
  studentName: string;
  score: number;
  totalPoints: number;
  percentage: number;
  attemptDate: string;
  passed: boolean;
}

interface Rubric {
  id: string;
  name: string;
  subject: string;
  criteriaCount: number;
  levels: number;
  createdDate: string;
  createdBy: string;
  usageCount: number;
}

const mockMaterials: StudyMaterial[] = [
  { id: 'm1', title: 'Quadratic Equations Complete Notes', subject: 'Mathematics', grade: 'Grade 10', type: 'notes', uploadDate: '2026-03-25', uploadedBy: 'Naledi Nkosi', downloads: 45 },
  { id: 'm2', title: 'Photosynthesis Video Lecture', subject: 'Life Sciences', grade: 'Grade 11', type: 'video', uploadDate: '2026-03-24', uploadedBy: 'James Botha', downloads: 62 },
  { id: 'm3', title: '2025 November Exam Paper', subject: 'Physical Science', grade: 'Grade 12', type: 'past_paper', uploadDate: '2026-03-20', uploadedBy: 'Naledi Nkosi', downloads: 89 },
  { id: 'm4', title: 'Essay Writing Guide', subject: 'English', grade: 'Grade 9', type: 'notes', uploadDate: '2026-03-18', uploadedBy: 'James Botha', downloads: 34 },
  { id: 'm5', title: 'Trigonometry Tutorial Series', subject: 'Mathematics', grade: 'Grade 11', type: 'video', uploadDate: '2026-03-15', uploadedBy: 'Naledi Nkosi', downloads: 71 },
  { id: 'm6', title: '2025 June Exam Paper', subject: 'Mathematics', grade: 'Grade 10', type: 'past_paper', uploadDate: '2026-03-10', uploadedBy: 'Naledi Nkosi', downloads: 53 },
  { id: 'm7', title: 'Afrikaans Opsomming Notas', subject: 'Afrikaans', grade: 'Grade 8', type: 'notes', uploadDate: '2026-03-08', uploadedBy: 'James Botha', downloads: 28 },
];

const mockQuizzes: Quiz[] = [
  { id: 'q1', title: 'Algebra Basics Quiz', subject: 'Mathematics', className: 'Grade 8A', questionCount: 15, questionType: 'mcq', timeLimit: 20, totalPoints: 30, status: 'published', attempts: 28, avgScore: 72 },
  { id: 'q2', title: 'Newton\'s Laws Assessment', subject: 'Physical Science', className: 'Grade 10A', questionCount: 10, questionType: 'mixed', timeLimit: 15, totalPoints: 20, status: 'published', attempts: 22, avgScore: 65 },
  { id: 'q3', title: 'Poetry Analysis', subject: 'English', className: 'Grade 9A', questionCount: 8, questionType: 'mcq', timeLimit: 10, totalPoints: 16, status: 'closed', attempts: 30, avgScore: 78 },
  { id: 'q4', title: 'Cell Biology True/False', subject: 'Life Sciences', className: 'Grade 11A', questionCount: 20, questionType: 'true_false', timeLimit: 10, totalPoints: 20, status: 'published', attempts: 18, avgScore: 81 },
  { id: 'q5', title: 'Term 2 Diagnostic Test', subject: 'Mathematics', className: 'Grade 12A', questionCount: 25, questionType: 'mixed', timeLimit: 45, totalPoints: 50, status: 'draft', attempts: 0, avgScore: 0 },
];

const mockResults: QuizResult[] = [
  { id: 'r1', quizTitle: 'Algebra Basics Quiz', studentName: 'Lerato Dlamini', score: 26, totalPoints: 30, percentage: 87, attemptDate: '2026-03-27', passed: true },
  { id: 'r2', quizTitle: 'Algebra Basics Quiz', studentName: 'Themba Mbeki', score: 22, totalPoints: 30, percentage: 73, attemptDate: '2026-03-27', passed: true },
  { id: 'r3', quizTitle: 'Algebra Basics Quiz', studentName: 'Ayanda Khumalo', score: 18, totalPoints: 30, percentage: 60, attemptDate: '2026-03-27', passed: true },
  { id: 'r4', quizTitle: 'Algebra Basics Quiz', studentName: 'Bongani Nzimande', score: 12, totalPoints: 30, percentage: 40, attemptDate: '2026-03-27', passed: false },
  { id: 'r5', quizTitle: 'Newton\'s Laws Assessment', studentName: 'Kagiso Mokoena', score: 16, totalPoints: 20, percentage: 80, attemptDate: '2026-03-26', passed: true },
  { id: 'r6', quizTitle: 'Newton\'s Laws Assessment', studentName: 'Palesa Mahlangu', score: 11, totalPoints: 20, percentage: 55, attemptDate: '2026-03-26', passed: true },
  { id: 'r7', quizTitle: 'Poetry Analysis', studentName: 'Nomsa Sithole', score: 14, totalPoints: 16, percentage: 88, attemptDate: '2026-03-25', passed: true },
  { id: 'r8', quizTitle: 'Cell Biology True/False', studentName: 'Lerato Dlamini', score: 18, totalPoints: 20, percentage: 90, attemptDate: '2026-03-25', passed: true },
];

const mockRubrics: Rubric[] = [
  { id: 'rb1', name: 'Essay Writing Rubric', subject: 'English', criteriaCount: 5, levels: 4, createdDate: '2026-02-10', createdBy: 'James Botha', usageCount: 12 },
  { id: 'rb2', name: 'Science Investigation Rubric', subject: 'Physical Science', criteriaCount: 6, levels: 4, createdDate: '2026-02-15', createdBy: 'Naledi Nkosi', usageCount: 8 },
  { id: 'rb3', name: 'Oral Presentation Rubric', subject: 'English', criteriaCount: 4, levels: 5, createdDate: '2026-01-20', createdBy: 'James Botha', usageCount: 15 },
  { id: 'rb4', name: 'Mathematics Problem Solving', subject: 'Mathematics', criteriaCount: 4, levels: 4, createdDate: '2026-03-01', createdBy: 'Naledi Nkosi', usageCount: 6 },
];

// ============== Column Definitions ==============

const materialTypeIcons: Record<string, typeof BookOpen> = {
  notes: FileText,
  video: Video,
  past_paper: ClipboardList,
};

const materialTypeStyles: Record<string, string> = {
  notes: 'bg-blue-100 text-blue-800',
  video: 'bg-purple-100 text-purple-800',
  past_paper: 'bg-amber-100 text-amber-800',
};

const materialColumns: ColumnDef<StudyMaterial>[] = [
  { accessorKey: 'title', header: 'Title', cell: ({ row }) => <span className="font-medium">{row.original.title}</span> },
  { accessorKey: 'subject', header: 'Subject' },
  { accessorKey: 'grade', header: 'Grade' },
  {
    id: 'type', header: 'Type', accessorKey: 'type',
    cell: ({ row }) => {
      const Icon = materialTypeIcons[row.original.type] ?? FileText;
      return (
        <Badge variant="secondary" className={materialTypeStyles[row.original.type] ?? ''}>
          <Icon className="mr-1 h-3 w-3" />
          {row.original.type === 'past_paper' ? 'Past Paper' : row.original.type}
        </Badge>
      );
    },
  },
  { accessorKey: 'uploadDate', header: 'Uploaded', cell: ({ row }) => formatDate(row.original.uploadDate) },
  { id: 'downloads', header: 'Downloads', cell: ({ row }) => row.original.downloads },
];

const quizStatusStyles: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-500',
  published: 'bg-emerald-100 text-emerald-800',
  closed: 'bg-slate-100 text-slate-700',
};

const quizColumns: ColumnDef<Quiz>[] = [
  { accessorKey: 'title', header: 'Quiz Title', cell: ({ row }) => <span className="font-medium">{row.original.title}</span> },
  { accessorKey: 'subject', header: 'Subject' },
  { accessorKey: 'className', header: 'Class' },
  { id: 'questions', header: 'Questions', cell: ({ row }) => row.original.questionCount },
  { id: 'time', header: 'Time (min)', cell: ({ row }) => row.original.timeLimit },
  { id: 'points', header: 'Points', cell: ({ row }) => row.original.totalPoints },
  {
    id: 'status', header: 'Status', accessorKey: 'status',
    cell: ({ row }) => <Badge variant="secondary" className={quizStatusStyles[row.original.status] ?? ''}>{row.original.status}</Badge>,
  },
  {
    id: 'stats', header: 'Avg Score',
    cell: ({ row }) => row.original.attempts > 0 ? (
      <span className="text-sm">{row.original.avgScore}% <span className="text-muted-foreground">({row.original.attempts} attempts)</span></span>
    ) : <span className="text-muted-foreground">–</span>,
  },
  {
    id: 'actions', header: '',
    cell: ({ row }) => {
      if (row.original.status === 'draft') {
        return <Button size="xs" onClick={() => toast.success(`"${row.original.title}" published`)}>Publish</Button>;
      }
      return null;
    },
  },
];

const resultColumns: ColumnDef<QuizResult>[] = [
  { accessorKey: 'studentName', header: 'Student', cell: ({ row }) => <span className="font-medium">{row.original.studentName}</span> },
  { accessorKey: 'quizTitle', header: 'Quiz' },
  { id: 'score', header: 'Score', cell: ({ row }) => `${row.original.score}/${row.original.totalPoints}` },
  {
    id: 'percentage', header: 'Percentage',
    cell: ({ row }) => (
      <span className={`font-medium ${row.original.percentage >= 50 ? 'text-emerald-600' : 'text-red-600'}`}>
        {row.original.percentage}%
      </span>
    ),
  },
  { accessorKey: 'attemptDate', header: 'Date', cell: ({ row }) => formatDate(row.original.attemptDate) },
  {
    id: 'passed', header: 'Result',
    cell: ({ row }) => row.original.passed
      ? <Badge variant="secondary" className="bg-emerald-100 text-emerald-800"><CheckCircle2 className="mr-1 h-3 w-3" /> Passed</Badge>
      : <Badge variant="secondary" className="bg-red-100 text-red-800">Failed</Badge>,
  },
];

const rubricColumns: ColumnDef<Rubric>[] = [
  { accessorKey: 'name', header: 'Rubric Name', cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
  { accessorKey: 'subject', header: 'Subject' },
  { id: 'criteria', header: 'Criteria', cell: ({ row }) => row.original.criteriaCount },
  { id: 'levels', header: 'Levels', cell: ({ row }) => row.original.levels },
  { accessorKey: 'createdDate', header: 'Created', cell: ({ row }) => formatDate(row.original.createdDate) },
  { id: 'usage', header: 'Used', cell: ({ row }) => `${row.original.usageCount} times` },
  {
    id: 'actions', header: '',
    cell: ({ row }) => (
      <Button size="xs" variant="outline" onClick={() => toast.info(`Editing "${row.original.name}"`)}>Edit</Button>
    ),
  },
];

// ============== Page Component ==============

export default function LearningPage() {
  const [materialDialogOpen, setMaterialDialogOpen] = useState(false);
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);
  const [rubricDialogOpen, setRubricDialogOpen] = useState(false);

  const totalMaterials = mockMaterials.length;
  const totalQuizzes = mockQuizzes.filter(q => q.status !== 'draft').length;
  const avgScore = Math.round(mockResults.reduce((sum, r) => sum + r.percentage, 0) / mockResults.length);
  const totalRubrics = mockRubrics.length;

  return (
    <div className="space-y-6">
      <PageHeader title="Learning Platform" description="Manage study materials, quizzes, results, and rubrics." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Study Materials" value={String(totalMaterials)} icon={BookOpen} description={`${mockMaterials.reduce((s, m) => s + m.downloads, 0)} downloads`} />
        <StatCard title="Active Quizzes" value={String(totalQuizzes)} icon={FileQuestion} description={`${mockQuizzes.length} total`} />
        <StatCard title="Avg Quiz Score" value={`${avgScore}%`} icon={BarChart3} description={`${mockResults.length} attempts`} />
        <StatCard title="Rubrics" value={String(totalRubrics)} icon={ClipboardList} description="Reusable templates" />
      </div>

      <Tabs defaultValue="materials">
        <TabsList>
          <TabsTrigger value="materials">Study Materials</TabsTrigger>
          <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="rubrics">Rubrics</TabsTrigger>
        </TabsList>

        <TabsContent value="materials">
          <div className="mb-4 flex justify-end">
            <Dialog open={materialDialogOpen} onOpenChange={setMaterialDialogOpen}>
              <DialogTrigger render={<Button />}>
                <Upload className="mr-2 h-4 w-4" /> Upload Material
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Upload Study Material</DialogTitle>
                  <DialogDescription>Add notes, videos, or past papers for students.</DialogDescription>
                </DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); toast.success('Material uploaded!'); setMaterialDialogOpen(false); }} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="matTitle">Title</Label>
                    <Input id="matTitle" placeholder="e.g. Chapter 5 Notes" />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Subject</Label>
                      <Select>
                        <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="maths">Mathematics</SelectItem>
                          <SelectItem value="english">English</SelectItem>
                          <SelectItem value="science">Physical Science</SelectItem>
                          <SelectItem value="life_sci">Life Sciences</SelectItem>
                          <SelectItem value="afrikaans">Afrikaans</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Grade</Label>
                      <Select>
                        <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {['Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'].map(g => (
                            <SelectItem key={g} value={g}>{g}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="notes">Notes</SelectItem>
                        <SelectItem value="video">Video</SelectItem>
                        <SelectItem value="past_paper">Past Paper</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fileUrl">File URL</Label>
                    <Input id="fileUrl" placeholder="https://..." />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setMaterialDialogOpen(false)}>Cancel</Button>
                    <Button type="submit">Upload</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <DataTable columns={materialColumns} data={mockMaterials} searchKey="title" searchPlaceholder="Search materials..." />
        </TabsContent>

        <TabsContent value="quizzes">
          <div className="mb-4 flex justify-end">
            <Dialog open={quizDialogOpen} onOpenChange={setQuizDialogOpen}>
              <DialogTrigger render={<Button />}>
                <Plus className="mr-2 h-4 w-4" /> Create Quiz
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Quiz</DialogTitle>
                  <DialogDescription>Set up a new quiz for your students.</DialogDescription>
                </DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); toast.success('Quiz created!'); setQuizDialogOpen(false); }} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="quizTitle">Quiz Title</Label>
                    <Input id="quizTitle" placeholder="e.g. Chapter 3 Review" />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Subject</Label>
                      <Select>
                        <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="maths">Mathematics</SelectItem>
                          <SelectItem value="english">English</SelectItem>
                          <SelectItem value="science">Physical Science</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Class</Label>
                      <Select>
                        <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="8a">Grade 8A</SelectItem>
                          <SelectItem value="9a">Grade 9A</SelectItem>
                          <SelectItem value="10a">Grade 10A</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Question Type</Label>
                      <Select>
                        <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mcq">MCQ</SelectItem>
                          <SelectItem value="true_false">True/False</SelectItem>
                          <SelectItem value="mixed">Mixed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="timeLimit">Time (min)</Label>
                      <Input id="timeLimit" type="number" placeholder="20" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="points">Points</Label>
                      <Input id="points" type="number" placeholder="30" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setQuizDialogOpen(false)}>Cancel</Button>
                    <Button type="submit">Create Quiz</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <DataTable columns={quizColumns} data={mockQuizzes} searchKey="title" searchPlaceholder="Search quizzes..." />
        </TabsContent>

        <TabsContent value="results">
          <div className="mb-4 grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Attempts</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{mockResults.length}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Pass Rate</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{Math.round((mockResults.filter(r => r.passed).length / mockResults.length) * 100)}%</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Average Score</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{avgScore}%</p></CardContent>
            </Card>
          </div>
          <DataTable columns={resultColumns} data={mockResults} searchKey="studentName" searchPlaceholder="Search results..." />
        </TabsContent>

        <TabsContent value="rubrics">
          <div className="mb-4 flex justify-end">
            <Dialog open={rubricDialogOpen} onOpenChange={setRubricDialogOpen}>
              <DialogTrigger render={<Button />}>
                <Plus className="mr-2 h-4 w-4" /> Create Rubric
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Rubric</DialogTitle>
                  <DialogDescription>Build a reusable assessment rubric.</DialogDescription>
                </DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); toast.success('Rubric created!'); setRubricDialogOpen(false); }} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="rubricName">Rubric Name</Label>
                    <Input id="rubricName" placeholder="e.g. Research Project Rubric" />
                  </div>
                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <Select>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="maths">Mathematics</SelectItem>
                        <SelectItem value="english">English</SelectItem>
                        <SelectItem value="science">Physical Science</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="criteria">Number of Criteria</Label>
                      <Input id="criteria" type="number" placeholder="4" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="levels">Achievement Levels</Label>
                      <Input id="levels" type="number" placeholder="4" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rubricDesc">Description</Label>
                    <Textarea id="rubricDesc" placeholder="Describe criteria..." rows={3} />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setRubricDialogOpen(false)}>Cancel</Button>
                    <Button type="submit">Create Rubric</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <DataTable columns={rubricColumns} data={mockRubrics} searchKey="name" searchPlaceholder="Search rubrics..." />
        </TabsContent>
      </Tabs>
    </div>
  );
}
