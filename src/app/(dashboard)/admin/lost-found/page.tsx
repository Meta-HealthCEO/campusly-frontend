'use client';

import { PackageSearch, CheckCircle2, AlertCircle, FileText, RotateCw } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useLostFound } from '@/hooks/useLostFound';
import { ReportFoundItemDialog } from '@/components/lost-found/ReportFoundItemDialog';
import { ArchiveConfirmDialog } from '@/components/lost-found/ArchiveConfirmDialog';
import { AdminFoundItemsTable } from '@/components/lost-found/AdminFoundItemsTable';
import { AdminLostReportsTable } from '@/components/lost-found/AdminLostReportsTable';
import type { FoundItemFormData } from '@/lib/validations';

export default function AdminLostFoundPage() {
  const {
    foundItems, lostReports, stats, loading,
    reportFoundItem, claimItem, verifyItem, matchItems,
    fetchSuggestions, archiveOldItems, softDelete, refresh,
  } = useLostFound();

  const onReportSubmit = async (data: FoundItemFormData) => {
    await reportFoundItem({
      name: data.name,
      description: data.description,
      category: data.category,
      location: data.location,
      dateFound: data.dateFound,
      photoUrl: data.photoUrl,
    });
  };

  const activeFound = foundItems.filter(
    (i) => i.status !== 'matched' && i.status !== 'archived'
  );
  const matchedItems = foundItems.filter((i) => i.status === 'matched');
  const archivedItems = foundItems.filter((i) => i.status === 'archived');
  const openReports = lostReports.filter((r) => r.status === 'open');

  const totalFound = stats?.totalFound ?? foundItems.length;
  const claimed = stats?.totalClaimed ?? foundItems.filter((i) => i.status === 'claimed').length;
  const unclaimed = stats?.totalUnclaimed ?? foundItems.filter((i) => i.status === 'unclaimed').length;
  const totalLostReports = stats?.totalReturned !== undefined
    ? lostReports.length
    : lostReports.length;

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="Lost & Found" description="Manage found items, lost reports, and match them together.">
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => refresh()} aria-label="Refresh">
            <RotateCw className="h-4 w-4" />
          </Button>
          <ArchiveConfirmDialog onConfirm={archiveOldItems} />
          <ReportFoundItemDialog onSubmit={onReportSubmit} />
        </div>
      </PageHeader>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Found Items"
          value={String(totalFound)}
          icon={PackageSearch}
          description="All logged items"
        />
        <StatCard
          title="Claimed"
          value={String(claimed)}
          icon={CheckCircle2}
          description="Returned to owner"
        />
        <StatCard
          title="Unclaimed"
          value={String(unclaimed)}
          icon={AlertCircle}
          description="Awaiting collection"
        />
        <StatCard
          title="Lost Reports"
          value={String(totalLostReports)}
          icon={FileText}
          description={`${openReports.length} open`}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="found">
        <TabsList>
          <TabsTrigger value="found">Found Items</TabsTrigger>
          <TabsTrigger value="lost">Lost Reports</TabsTrigger>
          <TabsTrigger value="matched">Matched</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>

        <TabsContent value="found">
          <AdminFoundItemsTable
            items={activeFound}
            onClaim={claimItem}
            onVerify={verifyItem}
            onDelete={softDelete}
          />
        </TabsContent>

        <TabsContent value="lost">
          <AdminLostReportsTable
            reports={lostReports}
            onMatch={matchItems}
            onDelete={softDelete}
            fetchSuggestions={fetchSuggestions}
          />
        </TabsContent>

        <TabsContent value="matched">
          <AdminFoundItemsTable
            items={matchedItems}
            onClaim={claimItem}
            onVerify={verifyItem}
            onDelete={softDelete}
            searchPlaceholder="Search matched items..."
          />
        </TabsContent>

        <TabsContent value="archived">
          <AdminFoundItemsTable
            items={archivedItems}
            onClaim={claimItem}
            onVerify={verifyItem}
            onDelete={softDelete}
            searchPlaceholder="Search archived items..."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
