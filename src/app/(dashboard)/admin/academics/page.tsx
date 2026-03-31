'use client';

import {
  GraduationCap, BookOpen, Calendar, ClipboardList,
  BookCheck, Scale, AlertTriangle, TrendingUp, FileText,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { GradeClassesTab } from '@/components/academic/GradeClassesTab';
import { SubjectsTab } from '@/components/academic/SubjectsTab';
import { TimetableTab } from '@/components/academic/TimetableTab';
import { AssessmentsTab } from '@/components/academic/AssessmentsTab';
import { ExamsTab } from '@/components/academic/ExamsTab';
import { WeightingsTab } from '@/components/academic/WeightingsTab';
import { RemedialsTab } from '@/components/academic/RemedialsTab';
import { PromotionTab } from '@/components/academic/PromotionTab';
import { PastPapersTab } from '@/components/academic/PastPapersTab';

export default function AcademicsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Academics"
        description="Manage grades, classes, subjects, timetables, assessments, exams, and more"
      />

      <Tabs defaultValue="grades">
        <TabsList className="flex-wrap">
          <TabsTrigger value="grades">
            <GraduationCap className="mr-1 h-4 w-4" />
            Grades & Classes
          </TabsTrigger>
          <TabsTrigger value="subjects">
            <BookOpen className="mr-1 h-4 w-4" />
            Subjects
          </TabsTrigger>
          <TabsTrigger value="timetable">
            <Calendar className="mr-1 h-4 w-4" />
            Timetable
          </TabsTrigger>
          <TabsTrigger value="assessments">
            <ClipboardList className="mr-1 h-4 w-4" />
            Assessments
          </TabsTrigger>
          <TabsTrigger value="exams">
            <BookCheck className="mr-1 h-4 w-4" />
            Exams
          </TabsTrigger>
          <TabsTrigger value="weightings">
            <Scale className="mr-1 h-4 w-4" />
            Weightings
          </TabsTrigger>
          <TabsTrigger value="papers">
            <FileText className="mr-1 h-4 w-4" />
            Past Papers
          </TabsTrigger>
          <TabsTrigger value="remedials">
            <AlertTriangle className="mr-1 h-4 w-4" />
            Remedials
          </TabsTrigger>
          <TabsTrigger value="promotion">
            <TrendingUp className="mr-1 h-4 w-4" />
            Promotion
          </TabsTrigger>
        </TabsList>

        <TabsContent value="grades" className="mt-4">
          <GradeClassesTab />
        </TabsContent>
        <TabsContent value="subjects" className="mt-4">
          <SubjectsTab />
        </TabsContent>
        <TabsContent value="timetable" className="mt-4">
          <TimetableTab />
        </TabsContent>
        <TabsContent value="assessments" className="mt-4">
          <AssessmentsTab />
        </TabsContent>
        <TabsContent value="exams" className="mt-4">
          <ExamsTab />
        </TabsContent>
        <TabsContent value="weightings" className="mt-4">
          <WeightingsTab />
        </TabsContent>
        <TabsContent value="papers" className="mt-4">
          <PastPapersTab />
        </TabsContent>
        <TabsContent value="remedials" className="mt-4">
          <RemedialsTab />
        </TabsContent>
        <TabsContent value="promotion" className="mt-4">
          <PromotionTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
