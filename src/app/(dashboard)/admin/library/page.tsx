'use client';

import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { BookOpen, BookCopy, AlertTriangle, Trophy, Banknote } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useLibrary } from '@/hooks/useLibrary';
import { useLibraryFines } from '@/hooks/useLibraryFines';
import { useCan } from '@/hooks/useCan';
import { BooksTab } from '@/components/library/BooksTab';
import { LoansTab } from '@/components/library/LoansTab';
import { ChallengesTab } from '@/components/library/ChallengesTab';
import { OverdueFinesTable } from '@/components/library/OverdueFinesTable';
import { FineConfigForm } from '@/components/library/FineConfigForm';

export default function AdminLibraryPage() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';
  const lib = useLibrary(schoolId);
  const finesHook = useLibraryFines();
  const canManage = useCan('manage_library');

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
        await Promise.allSettled([
          lib.fetchBooks(),
          lib.fetchOverdueLoans(),
          lib.fetchChallenges(),
          lib.fetchStudents(),
          finesHook.fetchFines(),
          finesHook.fetchConfig(),
        ]);
      } catch {
        console.error('Failed to initialise library data');
      } finally {
        setLoading(false);
      }
    }
    if (schoolId) init();
  }, [schoolId]);

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

  const handleGenerateInvoices = async () => {
    await finesHook.generateInvoices();
    await finesHook.fetchFines();
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
      <PageHeader title="Library Management" description="Manage books, loans, fines, and reading challenges" />

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
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
          title="Overdue Fines"
          value={`R${(finesHook.totalFineAmountCents / 100).toFixed(0)}`}
          icon={Banknote}
          description={`${finesHook.uninvoicedFines.length} uninvoiced`}
        />
        <StatCard
          title="Challenges"
          value={String(lib.challenges.length)}
          icon={Trophy}
          description="Reading challenges"
        />
      </div>

      <Tabs defaultValue="books">
        <TabsList className="flex-wrap">
          <TabsTrigger value="books">Books ({lib.booksTotal})</TabsTrigger>
          <TabsTrigger value="loans">
            Overdue Loans ({lib.overdueLoans.length})
          </TabsTrigger>
          <TabsTrigger value="fines">
            Fines ({finesHook.fines.length})
          </TabsTrigger>
          <TabsTrigger value="challenges">Challenges ({lib.challenges.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="books">
          <BooksTab
            books={lib.books}
            loading={lib.booksLoading}
            canManage={canManage}
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
            canManage={canManage}
            books={lib.books}
            students={lib.libraryStudents}
            onIssueLoan={lib.issueLoan}
            onReturnLoan={lib.returnLoan}
            onMarkLost={lib.markLost}
            onRefresh={refreshLoans}
          />
        </TabsContent>

        <TabsContent value="fines">
          <div className="space-y-6">
            <OverdueFinesTable
              fines={finesHook.fines}
              loading={finesHook.finesLoading}
              canManage={canManage}
              uninvoicedCount={finesHook.uninvoicedFines.length}
              totalAmountCents={finesHook.totalFineAmountCents}
              generating={finesHook.generating}
              onGenerateInvoices={handleGenerateInvoices}
              onRefresh={finesHook.fetchFines}
            />
            <FineConfigForm
              config={finesHook.config}
              loading={finesHook.configLoading}
              canManage={canManage}
              onSave={finesHook.updateConfig}
            />
          </div>
        </TabsContent>

        <TabsContent value="challenges">
          <ChallengesTab
            challenges={lib.challenges}
            loading={lib.challengesLoading}
            canManage={canManage}
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
