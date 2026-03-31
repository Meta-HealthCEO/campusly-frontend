'use client';

import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { BookOpen, BookCopy, AlertTriangle, Trophy } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useLibrary } from '@/hooks/useLibrary';
import { BooksTab } from '@/components/library/BooksTab';
import { LoansTab } from '@/components/library/LoansTab';
import { ChallengesTab } from '@/components/library/ChallengesTab';
import apiClient from '@/lib/api-client';
import type { Student } from '@/types';

export default function AdminLibraryPage() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';
  const lib = useLibrary(schoolId);

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const loadBooks = useCallback(async () => {
    const params: Record<string, string | number> = {};
    if (search) params.search = search;
    if (categoryFilter) params.category = categoryFilter;
    await lib.fetchBooks(params);
  }, [search, categoryFilter, lib.fetchBooks]);

  useEffect(() => {
    async function init() {
      try {
        const results = await Promise.allSettled([
          lib.fetchBooks(),
          lib.fetchOverdueLoans(),
          lib.fetchChallenges(),
          apiClient.get('/students'),
        ]);

        if (results[3].status === 'fulfilled') {
          const raw = results[3].value.data.data ?? results[3].value.data;
          const arr = Array.isArray(raw) ? raw : raw.data ?? [];
          setStudents(
            (arr as Record<string, unknown>[]).map((s) => ({
              ...s,
              id: (s._id as string) ?? (s.id as string),
            })) as Student[],
          );
        }
      } catch {
        console.error('Failed to initialise library data');
      } finally {
        setLoading(false);
      }
    }
    if (schoolId) init();
  }, [schoolId]);

  // Re-fetch books when search or category changes
  useEffect(() => {
    if (!loading && schoolId) {
      loadBooks();
    }
  }, [search, categoryFilter]);

  const refreshBooks = async () => {
    const params: Record<string, string | number> = {};
    if (search) params.search = search;
    if (categoryFilter) params.category = categoryFilter;
    await lib.fetchBooks(params);
  };

  const refreshLoans = async () => {
    await lib.fetchOverdueLoans();
    await refreshBooks();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Library Management" description="Manage books, loans, and reading challenges" />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Total Books" value={String(lib.booksTotal)} icon={BookCopy} description="In catalogue" />
        <StatCard
          title="Available"
          value={String(lib.books.reduce((s, b) => s + b.availableCopies, 0))}
          icon={BookOpen}
          description="Ready to issue"
        />
        <StatCard
          title="Overdue Loans"
          value={String(lib.overdueLoans.length)}
          icon={AlertTriangle}
          description={lib.overdueLoans.length > 0 ? 'Need attention' : 'None overdue'}
        />
        <StatCard
          title="Challenges"
          value={String(lib.challenges.length)}
          icon={Trophy}
          description="Reading challenges"
        />
      </div>

      <Tabs defaultValue="books">
        <TabsList>
          <TabsTrigger value="books">Books ({lib.booksTotal})</TabsTrigger>
          <TabsTrigger value="loans">
            Overdue Loans ({lib.overdueLoans.length})
          </TabsTrigger>
          <TabsTrigger value="challenges">Challenges ({lib.challenges.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="books">
          <BooksTab
            books={lib.books}
            loading={lib.booksLoading}
            onCreateBook={lib.createBook}
            onUpdateBook={lib.updateBook}
            onDeleteBook={lib.deleteBook}
            onRefresh={refreshBooks}
            search={search}
            onSearchChange={setSearch}
            categoryFilter={categoryFilter}
            onCategoryChange={setCategoryFilter}
          />
        </TabsContent>

        <TabsContent value="loans">
          <LoansTab
            loans={lib.overdueLoans}
            loading={lib.overdueLoading}
            books={lib.books}
            students={students}
            onIssueLoan={lib.issueLoan}
            onReturnLoan={lib.returnLoan}
            onMarkLost={lib.markLost}
            onRefresh={refreshLoans}
          />
        </TabsContent>

        <TabsContent value="challenges">
          <ChallengesTab
            challenges={lib.challenges}
            loading={lib.challengesLoading}
            leaderboard={lib.leaderboard}
            leaderboardLoading={lib.leaderboardLoading}
            onCreateChallenge={lib.createChallenge}
            onUpdateChallenge={lib.updateChallenge}
            onDeleteChallenge={lib.deleteChallenge}
            onFetchLeaderboard={lib.fetchLeaderboard}
            onRefresh={lib.fetchChallenges}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
