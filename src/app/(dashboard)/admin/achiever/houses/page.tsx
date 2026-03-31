'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { TermYearFilter } from '@/components/achiever/TermYearFilter';
import { HouseCard } from '@/components/achiever/HouseCard';
import { CreateHouseDialog } from '@/components/achiever/CreateHouseDialog';
import { EditHouseDialog } from '@/components/achiever/EditHouseDialog';
import { AwardPointsDialog } from '@/components/achiever/AwardPointsDialog';
import { HousePointHistory } from '@/components/achiever/HousePointHistory';
import { Trophy } from 'lucide-react';
import { useAchiever } from '@/hooks/useAchiever';
import type {
  ApiHousePoints, ApiHousePointLog,
  CreateHouseInput, AwardHousePointsInput,
} from '@/hooks/useAchiever';

export default function AdminHousesPage() {
  const {
    fetchHouses, createHouse, updateHouse,
    awardHousePoints, fetchHouseHistory, fetchLeaderboard,
  } = useAchiever();

  const [term, setTerm] = useState(1);
  const [year, setYear] = useState(new Date().getFullYear());

  const [houses, setHouses] = useState<ApiHousePoints[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  // Edit state
  const [editHouse, setEditHouse] = useState<ApiHousePoints | null>(null);

  // Award points state
  const [awardHouse, setAwardHouse] = useState<ApiHousePoints | null>(null);

  // History state
  const [historyHouse, setHistoryHouse] = useState<ApiHousePoints | null>(null);
  const [historyLogs, setHistoryLogs] = useState<ApiHousePointLog[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadHouses = useCallback(async () => {
    setLoading(true);
    const params: Record<string, number> = { year };
    if (term > 0) params.term = term;
    const lb = await fetchLeaderboard(params);
    setHouses(lb);
    setLoading(false);
  }, [year, term, fetchLeaderboard]);

  useEffect(() => { loadHouses(); }, [loadHouses]);

  const handleCreateHouse = async (data: CreateHouseInput) => {
    await createHouse(data);
    await loadHouses();
  };

  const handleUpdateHouse = async (id: string, data: Partial<CreateHouseInput>) => {
    await updateHouse(id, data);
    await loadHouses();
  };

  const handleAwardPoints = async (data: AwardHousePointsInput) => {
    await awardHousePoints(data);
    await loadHouses();
  };

  const loadHistory = useCallback(async (houseId: string, page: number) => {
    setHistoryLoading(true);
    const result = await fetchHouseHistory(houseId, page);
    setHistoryLogs(result.items);
    setHistoryTotal(result.total);
    setHistoryPage(page);
    setHistoryLoading(false);
  }, [fetchHouseHistory]);

  const handleViewHistory = (house: ApiHousePoints) => {
    setHistoryHouse(house);
    loadHistory(house._id, 1);
  };

  const handleHistoryPageChange = (page: number) => {
    if (historyHouse) loadHistory(historyHouse._id, page);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="House Management" description="Manage school houses and award points">
        <TermYearFilter term={term} year={year} onTermChange={setTerm} onYearChange={setYear} showAllTerms />
        <CreateHouseDialog open={createOpen} onOpenChange={setCreateOpen} onSubmit={handleCreateHouse} />
      </PageHeader>

      {houses.length === 0 ? (
        <EmptyState icon={Trophy} title="No houses" description="Create your first house to get started." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {houses.map((house, i) => (
            <HouseCard
              key={house._id}
              house={house}
              rank={i + 1}
              onAwardPoints={() => setAwardHouse(house)}
              onEdit={() => setEditHouse(house)}
              onViewHistory={() => handleViewHistory(house)}
            />
          ))}
        </div>
      )}

      {historyHouse && (
        <HousePointHistory
          logs={historyLogs}
          total={historyTotal}
          page={historyPage}
          onPageChange={handleHistoryPageChange}
          loading={historyLoading}
        />
      )}

      <EditHouseDialog
        open={!!editHouse}
        onOpenChange={(v) => { if (!v) setEditHouse(null); }}
        house={editHouse}
        onSubmit={handleUpdateHouse}
      />

      <AwardPointsDialog
        open={!!awardHouse}
        onOpenChange={(v) => { if (!v) setAwardHouse(null); }}
        house={awardHouse}
        onSubmit={handleAwardPoints}
      />
    </div>
  );
}
