'use client';

import { useState } from 'react';
import {
  Plus, Heart, TrendingUp, Users, Trophy,
  Gift, FileText, Loader2, Trash2, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useFundraising } from '@/hooks/useFundraising';
import type { Donation, Raffle, RecurringDonation, Campaign } from '@/hooks/useFundraising';
import { CampaignCard } from '@/components/fundraising/CampaignCard';
import { CreateCampaignDialog } from '@/components/fundraising/CreateCampaignDialog';
import { EditCampaignDialog } from '@/components/fundraising/EditCampaignDialog';
import { RecordDonationDialog } from '@/components/fundraising/RecordDonationDialog';
import { TaxCertificateDialog } from '@/components/fundraising/TaxCertificateDialog';
import { CreateRaffleDialog } from '@/components/fundraising/CreateRaffleDialog';
import { RecurringDonationDialog } from '@/components/fundraising/RecurringDonationDialog';
import { DonorWallPanel } from '@/components/fundraising/DonorWallPanel';
import { TaxCertificatesTable } from '@/components/fundraising/TaxCertificatesTable';
import { useAuthStore } from '@/stores/useAuthStore';

export default function FundraisingPage() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === 'super_admin';

  const fund = useFundraising();

  // Dialog states
  const [createOpen, setCreateOpen] = useState(false);
  const [editCampaign, setEditCampaign] = useState<Campaign | null>(null);
  const [donationOpen, setDonationOpen] = useState(false);
  const [taxDonation, setTaxDonation] = useState<Donation | null>(null);
  const [raffleOpen, setRaffleOpen] = useState(false);
  const [recurringOpen, setRecurringOpen] = useState(false);
  const [drawingId, setDrawingId] = useState<string | null>(null);
  const [donorWallCampaignId, setDonorWallCampaignId] = useState('');

  // Stats
  const activeCampaigns = fund.campaigns.filter((c) => c.isActive).length;
  const totalRaised = fund.campaigns.reduce((s, c) => s + c.raisedAmount, 0);
  const totalTarget = fund.campaigns.reduce((s, c) => s + c.targetAmount, 0);

  // Handlers
  async function handleDelete(id: string) {
    if (!confirm('Delete this campaign?')) return;
    try { await fund.deleteCampaign(id); } catch (e: unknown) { toast.error(fund.extractError(e, 'Failed to delete')); }
  }

  async function handleDrawWinners(raffleId: string) {
    if (!confirm('Draw winners for this raffle? This cannot be undone.')) return;
    setDrawingId(raffleId);
    try { await fund.drawWinners(raffleId); } catch (e: unknown) { toast.error(fund.extractError(e, 'Failed to draw winners')); }
    finally { setDrawingId(null); }
  }

  async function handleDeleteDonation(id: string) {
    if (!confirm('Delete this donation?')) return;
    try { await fund.deleteDonation(id); } catch (e: unknown) { toast.error(fund.extractError(e, 'Failed to delete donation')); }
  }

  async function handleCancelRecurring(id: string) {
    if (!confirm('Cancel this recurring donation?')) return;
    try { await fund.cancelRecurring(id); } catch (e: unknown) { toast.error(fund.extractError(e, 'Failed to cancel')); }
  }

  async function handleProcessRecurring() {
    if (!confirm('Process all due recurring donations?')) return;
    try { await fund.processRecurring(); } catch (e: unknown) { toast.error(fund.extractError(e, 'Processing failed')); }
  }

  // Column defs (inline to keep actions wired)
  const donationColumns: ColumnDef<Donation>[] = [
    { accessorKey: 'donorName', header: 'Donor', cell: ({ row }) => <span className="font-medium">{row.original.isAnonymous ? 'Anonymous' : row.original.donorName}</span> },
    { id: 'campaign', header: 'Campaign', cell: ({ row }) => row.original.campaignTitle || '-' },
    { id: 'amount', header: 'Amount', cell: ({ row }) => <span className="font-medium">{formatCurrency(row.original.amount)}</span> },
    { id: 'date', header: 'Date', cell: ({ row }) => formatDate(row.original.createdAt) },
    {
      id: 'actions', header: '',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button size="xs" variant="outline" onClick={() => setTaxDonation(row.original)}>
            <FileText className="mr-1 h-3 w-3" /> Tax Cert
          </Button>
          <Button size="xs" variant="ghost" onClick={() => handleDeleteDonation(row.original.id)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ),
    },
  ];

  const raffleColumns: ColumnDef<Raffle>[] = [
    { id: 'campaign', header: 'Campaign', cell: ({ row }) => row.original.campaignTitle || '-' },
    { id: 'ticketPrice', header: 'Ticket Price', cell: ({ row }) => formatCurrency(row.original.ticketPrice) },
    { id: 'sold', header: 'Tickets Sold', cell: ({ row }) => `${row.original.soldTickets}/${row.original.totalTickets}` },
    { id: 'revenue', header: 'Revenue', cell: ({ row }) => formatCurrency(row.original.soldTickets * row.original.ticketPrice) },
    { id: 'drawDate', header: 'Draw Date', cell: ({ row }) => formatDate(row.original.drawDate) },
    {
      id: 'status', header: 'Status',
      cell: ({ row }) => row.original.winnersDrawn
        ? <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">Drawn</Badge>
        : <Badge variant="secondary" className="bg-amber-100 text-amber-800">Selling</Badge>,
    },
    {
      id: 'actions', header: '',
      cell: ({ row }) => !row.original.winnersDrawn ? (
        <Button size="xs" onClick={() => handleDrawWinners(row.original.id)} disabled={drawingId === row.original.id}>
          {drawingId === row.original.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Gift className="mr-1 h-3 w-3" />}
          Draw Winner
        </Button>
      ) : null,
    },
  ];

  const recurringColumns: ColumnDef<RecurringDonation>[] = [
    { accessorKey: 'donorName', header: 'Donor' },
    { id: 'campaign', header: 'Campaign', cell: ({ row }) => row.original.campaignTitle || '-' },
    { id: 'amount', header: 'Amount', cell: ({ row }) => formatCurrency(row.original.amount) },
    { accessorKey: 'frequency', header: 'Frequency', cell: ({ row }) => <Badge variant="outline">{row.original.frequency}</Badge> },
    { id: 'nextCharge', header: 'Next Charge', cell: ({ row }) => formatDate(row.original.nextChargeDate) },
    { id: 'total', header: 'Total Charged', cell: ({ row }) => formatCurrency(row.original.totalCharged) },
    {
      id: 'status', header: 'Status',
      cell: ({ row }) => row.original.isActive
        ? <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">Active</Badge>
        : <Badge variant="secondary" className="bg-gray-100 text-gray-500">Cancelled</Badge>,
    },
    {
      id: 'actions', header: '',
      cell: ({ row }) => row.original.isActive ? (
        <Button size="xs" variant="outline" onClick={() => handleCancelRecurring(row.original.id)}>Cancel</Button>
      ) : null,
    },
  ];

  const isLoading = fund.campaignsLoading && fund.donationsLoading && fund.rafflesLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Fundraising" description="Manage campaigns, donations, raffles, and recurring donations.">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Campaign
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Active Campaigns" value={String(activeCampaigns)} icon={Heart} description="Currently running" />
        <StatCard title="Total Raised" value={formatCurrency(totalRaised)} icon={TrendingUp} description={`of ${formatCurrency(totalTarget)} target`} />
        <StatCard title="Total Donations" value={String(fund.donations.length)} icon={Users} description="Across all campaigns" />
        <StatCard title="Campaigns" value={String(fund.campaigns.length)} icon={Trophy} description={`${fund.campaigns.filter((c) => !c.isActive).length} inactive`} />
      </div>

      <Tabs defaultValue="campaigns">
        <TabsList>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="donations">Donations</TabsTrigger>
          <TabsTrigger value="raffles">Raffles</TabsTrigger>
          <TabsTrigger value="recurring">Recurring</TabsTrigger>
          <TabsTrigger value="certificates">Tax Certs</TabsTrigger>
          <TabsTrigger value="donor-wall">Donor Wall</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns">
          {fund.campaigns.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No campaigns yet. Create one to get started.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {fund.campaigns.map((c) => (
                <CampaignCard key={c.id} campaign={c} onEdit={setEditCampaign} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="donations">
          <div className="mb-4">
            <Button onClick={() => setDonationOpen(true)}><Plus className="mr-2 h-4 w-4" /> Record Donation</Button>
          </div>
          {fund.donationsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <DataTable columns={donationColumns} data={fund.donations} searchKey="donorName" searchPlaceholder="Search donations..." />
          )}
        </TabsContent>

        <TabsContent value="raffles">
          <div className="mb-4">
            <Button onClick={() => setRaffleOpen(true)}><Plus className="mr-2 h-4 w-4" /> Create Raffle</Button>
          </div>
          {fund.rafflesLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <DataTable columns={raffleColumns} data={fund.raffles} searchKey="campaignTitle" searchPlaceholder="Search raffles..." />
          )}
        </TabsContent>

        <TabsContent value="recurring">
          <div className="mb-4 flex gap-2">
            <Button onClick={() => setRecurringOpen(true)}><Plus className="mr-2 h-4 w-4" /> New Recurring</Button>
            {isSuperAdmin && (
              <Button variant="outline" onClick={handleProcessRecurring}>
                <RefreshCw className="mr-2 h-4 w-4" /> Process Due
              </Button>
            )}
          </div>
          {fund.recurringLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <DataTable columns={recurringColumns} data={fund.recurringDonations} searchKey="donorName" searchPlaceholder="Search recurring..." />
          )}
        </TabsContent>

        <TabsContent value="certificates">
          <TaxCertificatesTable certificates={fund.taxCerts} loading={fund.taxCertsLoading} />
        </TabsContent>

        <TabsContent value="donor-wall">
          <DonorWallPanel
            campaigns={fund.campaigns}
            selectedCampaignId={donorWallCampaignId}
            onCampaignChange={setDonorWallCampaignId}
            entries={fund.donorWall}
            loading={fund.donorWallLoading}
            onFetch={fund.fetchDonorWall}
          />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CreateCampaignDialog open={createOpen} onOpenChange={setCreateOpen} onSubmit={fund.createCampaign} />
      <EditCampaignDialog campaign={editCampaign} open={!!editCampaign} onOpenChange={(o) => { if (!o) setEditCampaign(null); }} onSubmit={fund.updateCampaign} />
      <RecordDonationDialog open={donationOpen} onOpenChange={setDonationOpen} campaigns={fund.campaigns} onSubmit={fund.recordDonation} />
      <TaxCertificateDialog donation={taxDonation} open={!!taxDonation} onOpenChange={(o) => { if (!o) setTaxDonation(null); }} onSubmit={fund.generateTaxCert} />
      <CreateRaffleDialog open={raffleOpen} onOpenChange={setRaffleOpen} campaigns={fund.campaigns} onSubmit={fund.createRaffle} />
      <RecurringDonationDialog open={recurringOpen} onOpenChange={setRecurringOpen} campaigns={fund.campaigns} onSubmit={fund.createRecurring} />
    </div>
  );
}
