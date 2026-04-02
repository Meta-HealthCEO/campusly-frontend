'use client';

import { useState, useEffect } from 'react';
import {
  BookOpen, FileQuestion, BarChart3, ClipboardList, Upload, Plus,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { DataTable } from '@/components/shared/DataTable';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAuthStore } from '@/stores/useAuthStore';
import { useLearningStore } from '@/stores/useLearningStore';
import { useLearningApi } from '@/hooks/useLearningApi';
import { useLearningAcademicData } from '@/hooks/useLearningAcademicData';
import {
  MaterialUploadDialog, QuizBuilderDialog, RubricEditorDialog,
  QuizResultsView, getMaterialColumns, getQuizColumns, getRubricColumns,
} from '@/components/learning';
import type { Rubric, StudyMaterial } from '@/components/learning/types';

export default function LearningPage() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';

  const { materials, materialsLoading, quizzes, quizzesLoading, rubrics, rubricsLoading } = useLearningStore();
  const {
    fetchMaterials, uploadMaterial, deleteMaterial, recordDownload,
    fetchQuizzes, createQuiz, publishQuiz, deleteQuiz,
    fetchRubrics, createRubric, updateRubric, deleteRubric,
  } = useLearningApi();

  const { subjects, classes, grades, fetchAcademicData } = useLearningAcademicData();

  const [materialDialogOpen, setMaterialDialogOpen] = useState(false);
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);
  const [rubricDialogOpen, setRubricDialogOpen] = useState(false);
  const [editingRubric, setEditingRubric] = useState<Rubric | null>(null);
  const [resultsQuizId, setResultsQuizId] = useState<string | null>(null);

  useEffect(() => {
    fetchAcademicData();
    fetchMaterials();
    fetchQuizzes();
    fetchRubrics();
  }, [fetchAcademicData, fetchMaterials, fetchQuizzes, fetchRubrics]);

  const handleDownload = (material: StudyMaterial) => {
    recordDownload(material.id);
    const url = material.fileUrl ?? material.videoUrl ?? material.externalLink;
    if (url) window.open(url, '_blank');
  };

  const handleEditRubric = (rubric: Rubric) => {
    setEditingRubric(rubric);
    setRubricDialogOpen(true);
  };

  const handleRubricSubmit = async (data: Parameters<typeof createRubric>[0]) => {
    if (editingRubric) {
      await updateRubric(editingRubric.id, data);
    } else {
      await createRubric(data);
    }
    fetchRubrics();
    setEditingRubric(null);
  };

  const activeQuizzes = quizzes.filter((q) => q.status !== 'draft').length;
  const totalDownloads = materials.reduce((s, m) => s + m.downloads, 0);

  if (materialsLoading && quizzesLoading && rubricsLoading) return <LoadingSpinner />;

  const materialColumns = getMaterialColumns(
    async (id) => { await deleteMaterial(id); fetchMaterials(); },
    handleDownload,
  );
  const quizColumns = getQuizColumns(
    async (id) => { await publishQuiz(id, 'published'); },
    async (id) => { await publishQuiz(id, 'closed'); },
    async (id) => { await deleteQuiz(id); fetchQuizzes(); },
    (id) => setResultsQuizId(id),
  );
  const rubricColumns = getRubricColumns(handleEditRubric, async (id) => { await deleteRubric(id); });

  if (resultsQuizId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Quiz Results" description="View attempts and scores for this quiz.">
          <Button variant="outline" onClick={() => setResultsQuizId(null)}>Back to Learning</Button>
        </PageHeader>
        <QuizResultsView quizId={resultsQuizId} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Learning Platform" description="Manage study materials, quizzes, results, and rubrics." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Study Materials" value={String(materials.length)} icon={BookOpen} description={`${totalDownloads} downloads`} />
        <StatCard title="Active Quizzes" value={String(activeQuizzes)} icon={FileQuestion} description={`${quizzes.length} total`} />
        <StatCard title="Total Quizzes" value={String(quizzes.length)} icon={BarChart3} description="All quizzes" />
        <StatCard title="Rubrics" value={String(rubrics.length)} icon={ClipboardList} description="Reusable templates" />
      </div>

      <Tabs defaultValue="materials">
        <TabsList>
          <TabsTrigger value="materials">Study Materials</TabsTrigger>
          <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
          <TabsTrigger value="rubrics">Rubrics</TabsTrigger>
        </TabsList>

        <TabsContent value="materials">
          <div className="mb-4 flex justify-end">
            <Button onClick={() => setMaterialDialogOpen(true)}>
              <Upload className="mr-2 h-4 w-4" /> Upload Material
            </Button>
          </div>
          <DataTable columns={materialColumns} data={materials} searchKey="title" searchPlaceholder="Search materials..." />
        </TabsContent>

        <TabsContent value="quizzes">
          <div className="mb-4 flex justify-end">
            <Button onClick={() => setQuizDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Create Quiz
            </Button>
          </div>
          <DataTable columns={quizColumns} data={quizzes} searchKey="title" searchPlaceholder="Search quizzes..." />
        </TabsContent>

        <TabsContent value="rubrics">
          <div className="mb-4 flex justify-end">
            <Button onClick={() => { setEditingRubric(null); setRubricDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Create Rubric
            </Button>
          </div>
          <DataTable columns={rubricColumns} data={rubrics} searchKey="name" searchPlaceholder="Search rubrics..." />
        </TabsContent>
      </Tabs>

      <MaterialUploadDialog
        open={materialDialogOpen}
        onOpenChange={setMaterialDialogOpen}
        subjects={subjects}
        grades={grades}
        schoolId={schoolId}
        onSubmit={async (data) => { await uploadMaterial(data); fetchMaterials(); }}
      />

      <QuizBuilderDialog
        open={quizDialogOpen}
        onOpenChange={setQuizDialogOpen}
        subjects={subjects}
        classes={classes}
        schoolId={schoolId}
        onSubmit={async (data) => { await createQuiz(data); fetchQuizzes(); }}
      />

      <RubricEditorDialog
        open={rubricDialogOpen}
        onOpenChange={(o) => { setRubricDialogOpen(o); if (!o) setEditingRubric(null); }}
        subjects={subjects}
        schoolId={schoolId}
        initialData={editingRubric}
        onSubmit={handleRubricSubmit}
      />
    </div>
  );
}
