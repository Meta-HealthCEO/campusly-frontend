'use client';

import { useState } from 'react';
import {
  Plus, Heart, TrendingUp, Users, Trophy,
  Gift, Ticket, FileText, PartyPopper,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { formatCurrency, formatDate } from '@/lib/utils';

// ============== Types & Mock Data ==============

interface Campaign {
  id: string;
  name: string;
  description: string;
  targetAmount: number;
  raisedAmount: number;
  startDate: string;
  endDate: string;
  type: 'general' | 'raffle' | 'walkathon';
  status: 'active' | 'completed' | 'upcoming';
  donorCount: number;
}

interface Donation {
  id: string;
  campaignId: string;
  campaignName: string;
  donorName: string;
  amount: number;
  date: string;
  isAnonymous: boolean;
}

interface Raffle {
  id: string;
  campaignId: string;
  name: string;
  ticketPrice: number;
  ticketsSold: number;
  totalTickets: number;
  prizeDescription: string;
  drawDate: string;
  winnerName: string | null;
  status: 'selling' | 'drawn' | 'upcoming';
}

const mockCampaigns: Campaign[] = [
  { id: 'c1', name: 'New Library Fund', description: 'Raising funds to expand the school library with 500 new books and digital resources.', targetAmount: 15000000, raisedAmount: 9850000, startDate: '2026-02-01', endDate: '2026-06-30', type: 'general', status: 'active', donorCount: 87 },
  { id: 'c2', name: 'Sports Equipment Drive', description: 'Replace and upgrade sports equipment for all codes.', targetAmount: 5000000, raisedAmount: 5000000, startDate: '2026-01-15', endDate: '2026-03-15', type: 'general', status: 'completed', donorCount: 45 },
  { id: 'c3', name: 'Easter Raffle 2026', description: 'Easter hamper raffle to support the bursary fund.', targetAmount: 2500000, raisedAmount: 1875000, startDate: '2026-03-01', endDate: '2026-04-10', type: 'raffle', status: 'active', donorCount: 125 },
  { id: 'c4', name: 'Walkathon for Wellness', description: 'Annual walkathon raising funds for school wellness programme.', targetAmount: 8000000, raisedAmount: 0, startDate: '2026-05-01', endDate: '2026-05-31', type: 'walkathon', status: 'upcoming', donorCount: 0 },
];

const mockDonations: Donation[] = [
  { id: 'd1', campaignId: 'c1', campaignName: 'New Library Fund', donorName: 'Sipho Dlamini', amount: 500000, date: '2026-03-28', isAnonymous: false },
  { id: 'd2', campaignId: 'c1', campaignName: 'New Library Fund', donorName: 'Anonymous', amount: 1000000, date: '2026-03-27', isAnonymous: true },
  { id: 'd3', campaignId: 'c1', campaignName: 'New Library Fund', donorName: 'Zanele Mbeki', amount: 250000, date: '2026-03-26', isAnonymous: false },
  { id: 'd4', campaignId: 'c2', campaignName: 'Sports Equipment Drive', donorName: 'Greenfield PTA', amount: 2000000, date: '2026-02-15', isAnonymous: false },
  { id: 'd5', campaignId: 'c3', campaignName: 'Easter Raffle 2026', donorName: 'Maria van der Merwe', amount: 50000, date: '2026-03-25', isAnonymous: false },
  { id: 'd6', campaignId: 'c1', campaignName: 'New Library Fund', donorName: 'James Botha', amount: 300000, date: '2026-03-24', isAnonymous: false },
  { id: 'd7', campaignId: 'c3', campaignName: 'Easter Raffle 2026', donorName: 'Anonymous', amount: 100000, date: '2026-03-23', isAnonymous: true },
  { id: 'd8', campaignId: 'c1', campaignName: 'New Library Fund', donorName: 'Nkosazana Khumalo', amount: 150000, date: '2026-03-22', isAnonymous: false },
];

const mockRaffles: Raffle[] = [
  { id: 'r1', campaignId: 'c3', name: 'Easter Hamper Grand Prize', ticketPrice: 5000, ticketsSold: 250, totalTickets: 500, prizeDescription: 'Luxury Easter hamper valued at R2,500 including chocolates, wine, and gift vouchers', drawDate: '2026-04-10', winnerName: null, status: 'selling' },
  { id: 'r2', campaignId: 'c3', name: 'Easter Bunny Runner-Up', ticketPrice: 2500, ticketsSold: 180, totalTickets: 300, prizeDescription: 'Artisan chocolate collection and Easter basket', drawDate: '2026-04-10', winnerName: null, status: 'selling' },
  { id: 'r3', campaignId: 'c2', name: 'Sports Day Lucky Draw', ticketPrice: 2000, ticketsSold: 200, totalTickets: 200, prizeDescription: 'Family pass to Sun City including accommodation', drawDate: '2026-03-10', winnerName: 'Lerato Dlamini', status: 'drawn' },
];

// ============== Column Definitions ==============

const typeStyles: Record<string, string> = {
  general: 'bg-blue-100 text-blue-800',
  raffle: 'bg-purple-100 text-purple-800',
  walkathon: 'bg-green-100 text-green-800',
};

const statusStyles: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800',
  completed: 'bg-gray-100 text-gray-500',
  upcoming: 'bg-blue-100 text-blue-800',
};

const donationColumns: ColumnDef<Donation>[] = [
  { accessorKey: 'donorName', header: 'Donor', cell: ({ row }) => <span className="font-medium">{row.original.isAnonymous ? 'Anonymous' : row.original.donorName}</span> },
  { accessorKey: 'campaignName', header: 'Campaign' },
  { id: 'amount', header: 'Amount', cell: ({ row }) => <span className="font-medium">{formatCurrency(row.original.amount)}</span> },
  { accessorKey: 'date', header: 'Date', cell: ({ row }) => formatDate(row.original.date) },
  {
    id: 'actions', header: '',
    cell: ({ row }) => (
      <Button size="xs" variant="outline" onClick={() => toast.success(`Section 18A certificate generated for ${row.original.donorName}`)}>
        <FileText className="mr-1 h-3 w-3" /> Tax Cert
      </Button>
    ),
  },
];

const raffleColumns: ColumnDef<Raffle>[] = [
  { accessorKey: 'name', header: 'Raffle', cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
  { id: 'ticketPrice', header: 'Ticket Price', cell: ({ row }) => formatCurrency(row.original.ticketPrice) },
  { id: 'sold', header: 'Tickets Sold', cell: ({ row }) => `${row.original.ticketsSold}/${row.original.totalTickets}` },
  { id: 'revenue', header: 'Revenue', cell: ({ row }) => formatCurrency(row.original.ticketsSold * row.original.ticketPrice) },
  { accessorKey: 'drawDate', header: 'Draw Date', cell: ({ row }) => formatDate(row.original.drawDate) },
  {
    id: 'status', header: 'Status', accessorKey: 'status',
    cell: ({ row }) => {
      if (row.original.status === 'drawn') {
        return <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">Winner: {row.original.winnerName}</Badge>;
      }
      return <Badge variant="secondary" className={row.original.status === 'selling' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}>{row.original.status}</Badge>;
    },
  },
  {
    id: 'actions', header: '',
    cell: ({ row }) => {
      if (row.original.status === 'selling') {
        return (
          <Button
            size="xs"
            onClick={() => toast.success(`🎉 Winner drawn! Congratulations to the lucky winner!`)}
          >
            <PartyPopper className="mr-1 h-3 w-3" /> Draw Winner
          </Button>
        );
      }
      return null;
    },
  },
];

// ============== Page Component ==============

export default function FundraisingPage() {
  const [dialogOpen, setDialogOpen] = useState(false);

  const activeCampaigns = mockCampaigns.filter(c => c.status === 'active').length;
  const totalRaised = mockCampaigns.reduce((sum, c) => sum + c.raisedAmount, 0);
  const totalTarget = mockCampaigns.reduce((sum, c) => sum + c.targetAmount, 0);
  const totalDonors = mockCampaigns.reduce((sum, c) => sum + c.donorCount, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Fundraising" description="Manage fundraising campaigns, donations, and raffles.">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="mr-2 h-4 w-4" />
            New Campaign
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Campaign</DialogTitle>
              <DialogDescription>Set up a new fundraising campaign.</DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                toast.success('Campaign created!');
                setDialogOpen(false);
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="campName">Campaign Name</Label>
                <Input id="campName" placeholder="e.g. Library Expansion Fund" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="campDesc">Description</Label>
                <Textarea id="campDesc" placeholder="Describe the campaign purpose..." rows={3} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="target">Target Amount (Rands)</Label>
                  <Input id="target" type="number" placeholder="e.g. 50000" />
                </div>
                <div className="space-y-2">
                  <Label>Campaign Type</Label>
                  <Select>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="raffle">Raffle</SelectItem>
                      <SelectItem value="walkathon">Walkathon</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input id="startDate" type="date" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input id="endDate" type="date" />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit">Create Campaign</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Active Campaigns" value={String(activeCampaigns)} icon={Heart} description="Currently running" />
        <StatCard title="Total Raised" value={formatCurrency(totalRaised)} icon={TrendingUp} description={`of ${formatCurrency(totalTarget)} target`} />
        <StatCard title="Total Donors" value={String(totalDonors)} icon={Users} description="Across all campaigns" />
        <StatCard title="Campaigns" value={String(mockCampaigns.length)} icon={Trophy} description={`${mockCampaigns.filter(c => c.status === 'completed').length} completed`} />
      </div>

      <Tabs defaultValue="campaigns">
        <TabsList>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="donations">Donations</TabsTrigger>
          <TabsTrigger value="raffles">Raffles</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns">
          <div className="grid gap-4 sm:grid-cols-2">
            {mockCampaigns.map(campaign => {
              const progress = campaign.targetAmount > 0 ? Math.min(Math.round((campaign.raisedAmount / campaign.targetAmount) * 100), 100) : 0;
              return (
                <Card key={campaign.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{campaign.name}</CardTitle>
                      <div className="flex gap-1">
                        <Badge variant="secondary" className={typeStyles[campaign.type] ?? ''}>{campaign.type}</Badge>
                        <Badge variant="secondary" className={statusStyles[campaign.status] ?? ''}>{campaign.status}</Badge>
                      </div>
                    </div>
                    <CardDescription>{campaign.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Raised: <span className="font-medium text-foreground">{formatCurrency(campaign.raisedAmount)}</span></span>
                      <span className="text-muted-foreground">Target: <span className="font-medium text-foreground">{formatCurrency(campaign.targetAmount)}</span></span>
                    </div>
                    <Progress value={progress} />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{campaign.donorCount} donors</span>
                      <span>{formatDate(campaign.startDate)} – {formatDate(campaign.endDate)}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="donations">
          <DataTable columns={donationColumns} data={mockDonations} searchKey="donorName" searchPlaceholder="Search donations..." />
        </TabsContent>

        <TabsContent value="raffles">
          <DataTable columns={raffleColumns} data={mockRaffles} searchKey="name" searchPlaceholder="Search raffles..." />
        </TabsContent>
      </Tabs>
    </div>
  );
}
