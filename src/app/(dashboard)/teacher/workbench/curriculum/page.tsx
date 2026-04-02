'use client';

import { useState } from 'react';
import { Plus, Upload, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { TopicTree } from '@/components/workbench/curriculum/TopicTree';
import { CoverageBar } from '@/components/workbench/curriculum/CoverageBar';
import { useCurriculum } from '@/hooks/useCurriculum';
import type { CurriculumTopic } from '@/types';

export default function CurriculumPage() {
  const {
    frameworks,
    topics,
    coverage,
    coverageReport,
    classes,
    subjects,
    loading,
    selectedFramework,
    setSelectedFramework,
    selectedSubject,
    setSelectedSubject,
    selectedGrade,
    setSelectedGrade,
    selectedClass,
    setSelectedClass,
    createTopic,
    deleteTopic,
    bulkImportTopics,
    updateCoverage,
  } = useCurriculum();

  const [addTopicOpen, setAddTopicOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkJson, setBulkJson] = useState('');
  const [topicForm, setTopicForm] = useState({
    title: '',
    description: '',
    cognitiveLevel: 'knowledge',
    estimatedHours: 1,
    order: 1,
    term: 1,
  });

  const handleAddTopic = async () => {
    if (!topicForm.title || !selectedFramework) return;
    await createTopic({
      frameworkId: selectedFramework,
      title: topicForm.title,
      description: topicForm.description,
      cognitiveLevel: topicForm.cognitiveLevel,
      estimatedHours: topicForm.estimatedHours,
      order: topicForm.order,
    });
    setAddTopicOpen(false);
    setTopicForm({ title: '', description: '', cognitiveLevel: 'knowledge', estimatedHours: 1, order: 1, term: 1 });
  };

  const handleBulkImport = async () => {
    if (!selectedFramework) return;
    try {
      const parsed = JSON.parse(bulkJson) as unknown[];
      await bulkImportTopics({ frameworkId: selectedFramework, topics: parsed as Partial<CurriculumTopic>[] });
      setBulkOpen(false);
      setBulkJson('');
    } catch {
      // JSON parse failed — toast handled inside hook
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Curriculum & Syllabus"
        description="Manage curriculum frameworks, topics, and track class coverage"
      >
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)}>
            <Upload className="mr-1.5 h-4 w-4" />
            <span className="hidden sm:inline">Bulk Import</span>
          </Button>
          <Button size="sm" onClick={() => setAddTopicOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Topic
          </Button>
        </div>
      </PageHeader>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select
          value={selectedFramework || 'all'}
          onValueChange={(v: unknown) => setSelectedFramework((v as string) === 'all' ? '' : (v as string))}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All frameworks" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All frameworks</SelectItem>
            {frameworks.map((f) => (
              <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedSubject || 'all'}
          onValueChange={(v: unknown) => setSelectedSubject((v as string) === 'all' ? '' : (v as string))}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="All subjects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All subjects</SelectItem>
            {subjects.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedClass || 'all'}
          onValueChange={(v: unknown) => setSelectedClass((v as string) === 'all' ? '' : (v as string))}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Select class" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">No class</SelectItem>
            {classes.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedGrade || 'all'}
          onValueChange={(v: unknown) => setSelectedGrade((v as string) === 'all' ? '' : (v as string))}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="All grades" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All grades</SelectItem>
            {[...new Set(frameworks.map((f) => f.gradeId))].map((g) => (
              <SelectItem key={g} value={g}>{g}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="topics">
        <TabsList className="flex-wrap">
          <TabsTrigger value="topics">Topic Tree</TabsTrigger>
          <TabsTrigger value="coverage">Coverage Dashboard</TabsTrigger>
        </TabsList>

        <TabsContent value="topics" className="mt-4">
          {topics.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No topics yet"
              description="Select a framework or add your first topic to get started."
            />
          ) : (
            <TopicTree
              topics={topics}
              frameworks={frameworks}
              coverageMap={coverage}
              classId={selectedClass}
              onUpdateCoverage={updateCoverage}
              onDeleteTopic={deleteTopic}
            />
          )}
        </TabsContent>

        <TabsContent value="coverage" className="mt-4">
          {coverageReport.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No coverage data"
              description="Select a class and subject to view coverage progress."
            />
          ) : (
            <Card>
              <CardContent className="pt-5 space-y-6">
                {coverageReport.map((r) => (
                  <CoverageBar key={r.term} report={r} />
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Topic Dialog */}
      <Dialog open={addTopicOpen} onOpenChange={setAddTopicOpen}>
        <DialogContent className="flex flex-col max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Add Topic</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            <div className="space-y-1">
              <Label htmlFor="topic-title">Title <span className="text-destructive">*</span></Label>
              <Input
                id="topic-title"
                value={topicForm.title}
                onChange={(e) => setTopicForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Algebraic Expressions"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="topic-desc">Description</Label>
              <Textarea
                id="topic-desc"
                value={topicForm.description}
                onChange={(e) => setTopicForm((p) => ({ ...p, description: e.target.value }))}
                rows={3}
                className="resize-none"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="topic-cognitive">Cognitive Level</Label>
                <Select
                  value={topicForm.cognitiveLevel}
                  onValueChange={(v: unknown) => setTopicForm((p) => ({ ...p, cognitiveLevel: v as string }))}
                >
                  <SelectTrigger id="topic-cognitive" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['knowledge','comprehension','application','analysis','synthesis','evaluation'].map((l) => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="topic-hours">Estimated Hours</Label>
                <Input
                  id="topic-hours"
                  type="number"
                  min={1}
                  value={topicForm.estimatedHours}
                  onChange={(e) => setTopicForm((p) => ({ ...p, estimatedHours: Number(e.target.value) }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddTopicOpen(false)}>Cancel</Button>
            <Button onClick={handleAddTopic} disabled={!topicForm.title || !selectedFramework}>
              Add Topic
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Dialog */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="flex flex-col max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Bulk Import Topics</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Paste a JSON array of topic objects. Each must include at minimum{' '}
              <code className="text-xs bg-muted px-1 rounded">title</code> and{' '}
              <code className="text-xs bg-muted px-1 rounded">cognitiveLevel</code>.
            </p>
            <Textarea
              value={bulkJson}
              onChange={(e) => setBulkJson(e.target.value)}
              rows={10}
              placeholder='[{"title": "Topic A", "cognitiveLevel": "knowledge", "estimatedHours": 2}]'
              className="font-mono text-xs resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkImport} disabled={!bulkJson || !selectedFramework}>
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
