'use client';

import { useState } from 'react';
import {
  Plus, Megaphone, Pin, CalendarClock, Eye,
  Star, Send, AlertCircle,
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
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { formatDate } from '@/lib/utils';

// ============== Types & Mock Data ==============

interface Announcement {
  id: string;
  title: string;
  body: string;
  target: 'whole_school' | 'grade' | 'class';
  targetLabel: string;
  priority: 'normal' | 'important' | 'urgent';
  publishDate: string;
  isPinned: boolean;
  status: 'published' | 'draft' | 'scheduled';
  sentTo: number;
  readBy: number;
  attachmentUrl?: string;
  createdBy: string;
}

const mockAnnouncements: Announcement[] = [
  { id: 'ann1', title: 'Term 2 Start Date Confirmed', body: 'Please note that Term 2 will commence on 14 April 2026. All students must be in full uniform.', target: 'whole_school', targetLabel: 'Whole School', priority: 'important', publishDate: '2026-03-28', isPinned: true, status: 'published', sentTo: 450, readBy: 380, createdBy: 'Thabo Molefe' },
  { id: 'ann2', title: 'Grade 12 Trial Exam Schedule', body: 'The trial examination schedule for Grade 12 has been finalized. Please check the school portal for details.', target: 'grade', targetLabel: 'Grade 12', priority: 'urgent', publishDate: '2026-03-27', isPinned: true, status: 'published', sentTo: 85, readBy: 72, createdBy: 'Naledi Nkosi' },
  { id: 'ann3', title: 'Sports Day Postponed', body: 'Due to weather conditions, the inter-house sports day has been postponed to 5 April 2026.', target: 'whole_school', targetLabel: 'Whole School', priority: 'normal', publishDate: '2026-03-26', isPinned: false, status: 'published', sentTo: 450, readBy: 310, createdBy: 'Thabo Molefe' },
  { id: 'ann4', title: 'Parent-Teacher Meeting', body: 'A parent-teacher meeting will be held on 2 April 2026 from 14:00 to 17:00. Please book your slot via the app.', target: 'whole_school', targetLabel: 'Whole School', priority: 'important', publishDate: '2026-03-25', isPinned: false, status: 'published', sentTo: 450, readBy: 290, createdBy: 'Thabo Molefe' },
  { id: 'ann5', title: 'Class 8A Field Trip Consent', body: 'Consent forms for the Cradle of Humankind field trip must be submitted by 31 March 2026.', target: 'class', targetLabel: 'Class 8A', priority: 'normal', publishDate: '2026-03-24', isPinned: false, status: 'published', sentTo: 32, readBy: 28, createdBy: 'Naledi Nkosi' },
  { id: 'ann6', title: 'Uniform Shop Easter Hours', body: 'The uniform shop will operate on reduced hours during the Easter break: 9:00-12:00 daily.', target: 'whole_school', targetLabel: 'Whole School', priority: 'normal', publishDate: '2026-04-01', isPinned: false, status: 'scheduled', sentTo: 0, readBy: 0, createdBy: 'Thabo Molefe' },
  { id: 'ann7', title: 'Fundraiser Cake Sale Results', body: 'Thank you to all who participated! We raised R12,450 for the library fund.', target: 'whole_school', targetLabel: 'Whole School', priority: 'normal', publishDate: '2026-03-20', isPinned: false, status: 'draft', sentTo: 0, readBy: 0, createdBy: 'Thabo Molefe' },
];

// ============== Column Definitions ==============

const priorityStyles: Record<string, string> = {
  normal: 'bg-slate-100 text-slate-700',
  important: 'bg-amber-100 text-amber-800',
  urgent: 'bg-red-100 text-red-800',
};

const statusStyles: Record<string, string> = {
  published: 'bg-emerald-100 text-emerald-800',
  draft: 'bg-gray-100 text-gray-500',
  scheduled: 'bg-blue-100 text-blue-800',
};

const targetStyles: Record<string, string> = {
  whole_school: 'bg-purple-100 text-purple-800',
  grade: 'bg-blue-100 text-blue-800',
  class: 'bg-orange-100 text-orange-800',
};

const columns: ColumnDef<Announcement>[] = [
  {
    id: 'pinned', header: '',
    cell: ({ row }) => row.original.isPinned ? <Star className="h-4 w-4 text-amber-500 fill-amber-500" /> : null,
  },
  { accessorKey: 'title', header: 'Title', cell: ({ row }) => <span className="font-medium">{row.original.title}</span> },
  {
    id: 'target', header: 'Audience', accessorKey: 'targetLabel',
    cell: ({ row }) => (
      <Badge variant="secondary" className={targetStyles[row.original.target] ?? ''}>{row.original.targetLabel}</Badge>
    ),
  },
  {
    id: 'priority', header: 'Priority', accessorKey: 'priority',
    cell: ({ row }) => (
      <Badge variant="secondary" className={priorityStyles[row.original.priority] ?? ''}>
        {row.original.priority}
      </Badge>
    ),
  },
  {
    accessorKey: 'publishDate', header: 'Date',
    cell: ({ row }) => formatDate(row.original.publishDate),
  },
  {
    id: 'status', header: 'Status', accessorKey: 'status',
    cell: ({ row }) => (
      <Badge variant="secondary" className={statusStyles[row.original.status] ?? ''}>
        {row.original.status}
      </Badge>
    ),
  },
  {
    id: 'readRate', header: 'Read Rate',
    cell: ({ row }) => {
      if (row.original.sentTo === 0) return <span className="text-muted-foreground">–</span>;
      const rate = Math.round((row.original.readBy / row.original.sentTo) * 100);
      return <span className="font-medium">{rate}%</span>;
    },
  },
  {
    id: 'actions', header: '',
    cell: ({ row }) => (
      <div className="flex gap-1">
        <Button size="xs" variant="outline" onClick={() => toast.info(`Viewing "${row.original.title}"`)}>
          <Eye className="mr-1 h-3 w-3" /> View
        </Button>
        {row.original.status === 'draft' && (
          <Button size="xs" onClick={() => toast.success(`"${row.original.title}" published`)}>
            <Send className="mr-1 h-3 w-3" /> Publish
          </Button>
        )}
      </div>
    ),
  },
];

// ============== Detail Panel ==============

function AnnouncementDetail({ announcement }: { announcement: Announcement }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          {announcement.isPinned && <Star className="h-4 w-4 text-amber-500 fill-amber-500" />}
          <CardTitle className="text-base">{announcement.title}</CardTitle>
        </div>
        <CardDescription>
          By {announcement.createdBy} &middot; {formatDate(announcement.publishDate)} &middot;{' '}
          <Badge variant="secondary" className={priorityStyles[announcement.priority] ?? ''}>
            {announcement.priority}
          </Badge>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{announcement.body}</p>
        {announcement.sentTo > 0 && (
          <div className="flex gap-6 rounded-lg border p-3">
            <div>
              <p className="text-xs text-muted-foreground">Sent to</p>
              <p className="text-lg font-bold">{announcement.sentTo}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Read by</p>
              <p className="text-lg font-bold">{announcement.readBy}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Read rate</p>
              <p className="text-lg font-bold">{Math.round((announcement.readBy / announcement.sentTo) * 100)}%</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============== Page Component ==============

export default function AnnouncementsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  const total = mockAnnouncements.length;
  const pinned = mockAnnouncements.filter(a => a.isPinned).length;
  const scheduled = mockAnnouncements.filter(a => a.status === 'scheduled').length;
  const published = mockAnnouncements.filter(a => a.status === 'published');
  const avgReadRate = published.length > 0
    ? Math.round(published.reduce((sum, a) => sum + (a.sentTo > 0 ? (a.readBy / a.sentTo) * 100 : 0), 0) / published.length)
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Announcements" description="Create and manage school-wide announcements.">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="mr-2 h-4 w-4" />
            New Announcement
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Announcement</DialogTitle>
              <DialogDescription>Compose a new announcement for students, parents, or staff.</DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                toast.success('Announcement created!');
                setDialogOpen(false);
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="annTitle">Title</Label>
                <Input id="annTitle" placeholder="Announcement title" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="annBody">Body</Label>
                <Textarea id="annBody" placeholder="Write your announcement..." rows={4} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Target Audience</Label>
                  <Select>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select audience" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="whole_school">Whole School</SelectItem>
                      <SelectItem value="grade_8">Grade 8</SelectItem>
                      <SelectItem value="grade_9">Grade 9</SelectItem>
                      <SelectItem value="grade_10">Grade 10</SelectItem>
                      <SelectItem value="grade_11">Grade 11</SelectItem>
                      <SelectItem value="grade_12">Grade 12</SelectItem>
                      <SelectItem value="class_8a">Class 8A</SelectItem>
                      <SelectItem value="class_8b">Class 8B</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select priority" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="important">Important</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="publishDate">Publish Date</Label>
                  <Input id="publishDate" type="date" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="attachUrl">Attachment URL</Label>
                  <Input id="attachUrl" placeholder="https://..." />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch />
                <Label>Pin to top</Label>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit">Create Announcement</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Announcements" value={String(total)} icon={Megaphone} description="All time" />
        <StatCard title="Pinned" value={String(pinned)} icon={Pin} description="Shown at top" />
        <StatCard title="Scheduled" value={String(scheduled)} icon={CalendarClock} description="Pending publish" />
        <StatCard title="Avg Read Rate" value={`${avgReadRate}%`} icon={Eye} description="Across published" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DataTable
            columns={columns}
            data={mockAnnouncements}
            searchKey="title"
            searchPlaceholder="Search announcements..."
          />
        </div>
        <div>
          {selectedAnnouncement ? (
            <AnnouncementDetail announcement={selectedAnnouncement} />
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="mb-3 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Click &quot;View&quot; on any announcement to see details and read receipt stats.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
