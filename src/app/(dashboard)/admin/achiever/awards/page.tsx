'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { TermYearFilter } from '@/components/achiever/TermYearFilter';
import { AchievementCard } from '@/components/achiever/AchievementCard';
import { CreateAchievementDialog } from '@/components/achiever/CreateAchievementDialog';
import { EditAchievementDialog } from '@/components/achiever/EditAchievementDialog';
import { DeleteAchievementDialog } from '@/components/achiever/DeleteAchievementDialog';
import { AwardsFilterBar } from '@/components/achiever/AwardsFilterBar';
import { Award } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useAchiever } from '@/hooks/useAchiever';
import type { ApiAchievement, CreateAchievementInput } from '@/hooks/useAchiever';

export default function AdminAwardsPage() {
  const { user } = useAuthStore();
  const { fetchAchievements, createAchievement, updateAchievement, deleteAchievement } = useAchiever();

  const [term, setTerm] = useState(1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [typeFilter, setTypeFilter] = useState('');
  const [studentFilter, setStudentFilter] = useState('');

  const [achievements, setAchievements] = useState<ApiAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const [editItem, setEditItem] = useState<ApiAchievement | null>(null);
  const [deleteItem, setDeleteItem] = useState<ApiAchievement | null>(null);

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const loadAchievements = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string | number> = { year };
    if (term > 0) params.term = term;
    if (typeFilter) params.type = typeFilter;
    if (studentFilter) params.studentId = studentFilter;
    const result = await fetchAchievements(params);
    setAchievements(result.items);
    setLoading(false);
  }, [year, term, typeFilter, studentFilter, fetchAchievements]);

  useEffect(() => { loadAchievements(); }, [loadAchievements]);

  const handleCreate = async (data: CreateAchievementInput) => {
    await createAchievement(data);
    await loadAchievements();
  };

  const handleUpdate = async (id: string, data: Partial<CreateAchievementInput>) => {
    await updateAchievement(id, data);
    await loadAchievements();
  };

  const handleDelete = async (id: string) => {
    await deleteAchievement(id);
    setAchievements((prev) => prev.filter((a) => a._id !== id));
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Achievement Awards" description="Create and manage student achievements">
        <TermYearFilter term={term} year={year} onTermChange={setTerm} onYearChange={setYear} showAllTerms />
        <CreateAchievementDialog open={createOpen} onOpenChange={setCreateOpen} onSubmit={handleCreate} />
      </PageHeader>

      <AwardsFilterBar
        typeFilter={typeFilter}
        onTypeChange={setTypeFilter}
        studentFilter={studentFilter}
        onStudentChange={setStudentFilter}
      />

      {loading ? (
        <LoadingSpinner />
      ) : achievements.length === 0 ? (
        <EmptyState icon={Award} title="No achievements" description="Create an achievement to get started." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {achievements.map((a) => (
            <AchievementCard
              key={a._id}
              achievement={a}
              showActions
              onEdit={() => setEditItem(a)}
              onDelete={isAdmin ? () => setDeleteItem(a) : undefined}
            />
          ))}
        </div>
      )}

      <EditAchievementDialog
        open={!!editItem}
        onOpenChange={(v) => { if (!v) setEditItem(null); }}
        achievement={editItem}
        onSubmit={handleUpdate}
      />

      <DeleteAchievementDialog
        open={!!deleteItem}
        onOpenChange={(v) => { if (!v) setDeleteItem(null); }}
        achievement={deleteItem}
        onConfirm={handleDelete}
      />
    </div>
  );
}
