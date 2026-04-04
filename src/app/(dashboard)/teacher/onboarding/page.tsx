'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/useAuthStore';
import { useTeacherOnboarding } from '@/hooks/useTeacherOnboarding';
import { useGrades } from '@/hooks/useAcademics';
import { SchoolSetupStep } from '@/components/onboarding/SchoolSetupStep';
import type { SchoolSetupData } from '@/components/onboarding/SchoolSetupStep';
import { GradesSubjectsStep } from '@/components/onboarding/GradesSubjectsStep';
import { AddStudentsStep } from '@/components/onboarding/AddStudentsStep';
import { GRADE_LEVELS } from '@/lib/constants';
import type { Grade } from '@/types';

export default function TeacherOnboardingPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { updateSchool, createGrade, createSubject, createStudent, bulkCreateStudents } =
    useTeacherOnboarding();
  const { grades, refetch: refetchGrades } = useGrades();

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [createdGrades, setCreatedGrades] = useState<Grade[]>([]);

  const schoolName = useMemo(() => {
    if (!user) return '';
    return `${user.firstName}'s Classroom`;
  }, [user]);

  const handleSchoolSetup = useCallback(async (data: SchoolSetupData) => {
    setIsLoading(true);
    try {
      await updateSchool({ name: data.name, type: data.type, province: data.province });
      toast.success('School details saved');
      setStep(2);
    } catch {
      toast.error('Failed to update school details');
    } finally {
      setIsLoading(false);
    }
  }, [updateSchool]);

  const handleGradesSubjects = useCallback(async (gradeNames: string[], subjectNames: string[]) => {
    setIsLoading(true);
    try {
      // Create grades
      const newGrades: Grade[] = [];
      for (const name of gradeNames) {
        const orderIndex = GRADE_LEVELS.indexOf(name as typeof GRADE_LEVELS[number]);
        const grade = await createGrade(name, orderIndex >= 0 ? orderIndex : 0);
        newGrades.push(grade);
      }

      // Create subjects with all selected grade IDs
      const gradeIds = newGrades.map((g) => g.id);
      for (const name of subjectNames) {
        const code = name.substring(0, 3).toUpperCase();
        await createSubject(name, code, gradeIds);
      }

      setCreatedGrades(newGrades);
      await refetchGrades();
      toast.success(`Created ${newGrades.length} grades and ${subjectNames.length} subjects`);
      setStep(3);
    } catch {
      toast.error('Failed to create grades/subjects');
    } finally {
      setIsLoading(false);
    }
  }, [createGrade, createSubject, refetchGrades]);

  const handleFinish = useCallback(() => {
    toast.success('Onboarding complete! Welcome to Campusly.');
    router.push('/teacher');
  }, [router]);

  const allGrades = createdGrades.length > 0 ? createdGrades : grades;

  const stepLabels = ['School Setup', 'Grades & Subjects', 'Students'];

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-12">
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {stepLabels.map((label, i) => (
            <div key={label} className="flex items-center gap-1">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                  i + 1 <= step
                    ? 'bg-[#2563EB] text-white'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {i + 1}
              </div>
              <span className="hidden sm:inline text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
        <div className="h-1 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-[#2563EB] transition-all"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
      </div>

      {/* Step content */}
      <div className="rounded-xl border bg-card p-4 sm:p-6">
        {step === 1 && (
          <SchoolSetupStep
            defaultName={schoolName}
            onNext={handleSchoolSetup}
            isLoading={isLoading}
          />
        )}
        {step === 2 && (
          <GradesSubjectsStep
            onNext={handleGradesSubjects}
            onBack={() => setStep(1)}
            isLoading={isLoading}
          />
        )}
        {step === 3 && (
          <AddStudentsStep
            grades={allGrades}
            onCreateStudent={createStudent}
            onBulkCreate={bulkCreateStudents}
            onBack={() => setStep(2)}
            onFinish={handleFinish}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
}
