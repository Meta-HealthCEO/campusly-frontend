'use client';

import { useState } from 'react';
import { Plus, Archive, PackageSearch, CheckCircle2, AlertCircle, FileText, Sparkles } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { mockFoundItems, mockLostReports } from '@/lib/mock-data';
import { foundItemSchema, type FoundItemFormData } from '@/lib/validations';
import { formatDate } from '@/lib/utils';
import type { FoundItem, LostReport } from '@/types';

const categoryLabels: Record<string, string> = {
  clothing: 'Clothing',
  stationery: 'Stationery',
  lunch_box: 'Lunch Box',
  electronics: 'Electronics',
  sports: 'Sports',
  bags: 'Bags',
  other: 'Other',
};

const categoryStyles: Record<string, string> = {
  clothing: 'bg-blue-100 text-blue-800',
  stationery: 'bg-purple-100 text-purple-800',
  lunch_box: 'bg-orange-100 text-orange-800',
  electronics: 'bg-slate-100 text-slate-800',
  sports: 'bg-green-100 text-green-800',
  bags: 'bg-rose-100 text-rose-800',
  other: 'bg-gray-100 text-gray-800',
};

const foundStatusStyles: Record<string, string> = {
  unclaimed: 'bg-amber-100 text-amber-800',
  claimed: 'bg-emerald-100 text-emerald-800',
  matched: 'bg-blue-100 text-blue-800',
  archived: 'bg-gray-100 text-gray-500',
};

const lostStatusStyles: Record<string, string> = {
  open: 'bg-amber-100 text-amber-800',
  matched: 'bg-blue-100 text-blue-800',
  resolved: 'bg-emerald-100 text-emerald-800',
  closed: 'bg-gray-100 text-gray-500',
};

const foundColumns: ColumnDef<FoundItem>[] = [
  {
    accessorKey: 'name',
    header: 'Item Name',
    cell: ({ row }) => (
      <span className="font-medium">{row.original.name}</span>
    ),
  },
  {
    id: 'category',
    header: 'Category',
    accessorKey: 'category',
    cell: ({ row }) => (
      <Badge variant="secondary" className={categoryStyles[row.original.category] ?? ''}>
        {categoryLabels[row.original.category] ?? row.original.category}
      </Badge>
    ),
  },
  {
    accessorKey: 'location',
    header: 'Location Found',
  },
  {
    accessorKey: 'dateFound',
    header: 'Date Found',
    cell: ({ row }) => formatDate(row.original.dateFound),
  },
  {
    id: 'status',
    header: 'Status',
    accessorKey: 'status',
    cell: ({ row }) => (
      <Badge variant="secondary" className={foundStatusStyles[row.original.status] ?? ''}>
        {row.original.status.charAt(0).toUpperCase() + row.original.status.slice(1)}
      </Badge>
    ),
  },
  {
    accessorKey: 'reportedBy',
    header: 'Reported By',
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const item = row.original;
      if (item.status === 'unclaimed') {
        return (
          <div className="flex gap-1">
            <Button size="xs" variant="outline" onClick={() => toast.success(`Marked "${item.name}" as claimed`)}>
              Claim
            </Button>
            <Button size="xs" variant="ghost" onClick={() => toast.info(`Archived "${item.name}"`)}>
              Archive
            </Button>
          </div>
        );
      }
      if (item.status === 'matched') {
        return (
          <Button size="xs" variant="outline" onClick={() => toast.success(`Verified match for "${item.name}"`)}>
            Verify
          </Button>
        );
      }
      return null;
    },
  },
];

const lostColumns: ColumnDef<LostReport>[] = [
  {
    accessorKey: 'itemName',
    header: 'Item Name',
    cell: ({ row }) => (
      <span className="font-medium">{row.original.itemName}</span>
    ),
  },
  {
    id: 'category',
    header: 'Category',
    accessorKey: 'category',
    cell: ({ row }) => (
      <Badge variant="secondary" className={categoryStyles[row.original.category] ?? ''}>
        {categoryLabels[row.original.category] ?? row.original.category}
      </Badge>
    ),
  },
  {
    accessorKey: 'studentName',
    header: 'Student',
  },
  {
    accessorKey: 'dateLost',
    header: 'Date Lost',
    cell: ({ row }) => formatDate(row.original.dateLost),
  },
  {
    id: 'status',
    header: 'Status',
    accessorKey: 'status',
    cell: ({ row }) => (
      <Badge variant="secondary" className={lostStatusStyles[row.original.status] ?? ''}>
        {row.original.status.charAt(0).toUpperCase() + row.original.status.slice(1)}
      </Badge>
    ),
  },
  {
    accessorKey: 'parentName',
    header: 'Reported By',
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const report = row.original;
      if (report.status === 'open') {
        return (
          <Button size="xs" variant="outline" onClick={() => toast.info(`Viewing match suggestions for "${report.itemName}"`)}>
            <Sparkles className="mr-1 h-3 w-3" />
            Find Match
          </Button>
        );
      }
      if (report.status === 'matched') {
        return (
          <Button size="xs" variant="outline" onClick={() => toast.success(`Resolved report for "${report.itemName}"`)}>
            Resolve
          </Button>
        );
      }
      return null;
    },
  },
];

function MatchSuggestionsPanel({ report }: { report: LostReport }) {
  const suggestions = mockFoundItems.filter(
    (item) =>
      item.status === 'unclaimed' &&
      (item.category === report.category ||
        item.name.toLowerCase().includes(report.itemName.toLowerCase().split(' ')[0]))
  );

  if (suggestions.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          Match Suggestions for &ldquo;{report.itemName}&rdquo;
        </CardTitle>
        <CardDescription>
          Potential found items matching this lost report
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {suggestions.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div>
                <p className="text-sm font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  Found at {item.location} on {formatDate(item.dateFound)}
                </p>
              </div>
              <Button
                size="xs"
                onClick={() =>
                  toast.success(`Matched "${report.itemName}" with "${item.name}"`)
                }
              >
                Match
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminLostFoundPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FoundItemFormData>({
    resolver: zodResolver(foundItemSchema),
  });

  const onSubmit = async (data: FoundItemFormData) => {
    console.log('New found item:', data);
    toast.success('Found item logged successfully!');
    reset();
    setDialogOpen(false);
  };

  const totalFound = mockFoundItems.length;
  const claimed = mockFoundItems.filter((i) => i.status === 'claimed').length;
  const unclaimed = mockFoundItems.filter((i) => i.status === 'unclaimed').length;
  const lostReports = mockLostReports.length;

  const foundItems = mockFoundItems.filter((i) => i.status !== 'matched' && i.status !== 'archived');
  const matchedItems = [...mockFoundItems.filter((i) => i.status === 'matched')];
  const archivedItems = mockFoundItems.filter((i) => i.status === 'archived');
  const openReports = mockLostReports.filter((r) => r.status === 'open');

  return (
    <div className="space-y-6">
      <PageHeader title="Lost & Found" description="Manage found items, lost reports, and match them together.">
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => toast.info('Archiving items older than 30 days...')}>
            <Archive className="mr-2 h-4 w-4" />
            Archive Old Items
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger render={<Button />}>
              <Plus className="mr-2 h-4 w-4" />
              Log Found Item
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Log Found Item</DialogTitle>
                <DialogDescription>
                  Enter details about the item that was found.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Item Name</Label>
                  <Input id="name" {...register('name')} placeholder="e.g. Blue School Jacket" />
                  {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" {...register('description')} placeholder="Describe the item..." />
                  {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select onValueChange={(val: unknown) => setValue('category', val as FoundItemFormData['category'])}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="clothing">Clothing</SelectItem>
                        <SelectItem value="stationery">Stationery</SelectItem>
                        <SelectItem value="lunch_box">Lunch Box</SelectItem>
                        <SelectItem value="electronics">Electronics</SelectItem>
                        <SelectItem value="sports">Sports</SelectItem>
                        <SelectItem value="bags">Bags</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dateFound">Date Found</Label>
                    <Input id="dateFound" type="date" {...register('dateFound')} />
                    {errors.dateFound && <p className="text-xs text-destructive">{errors.dateFound.message}</p>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location Found</Label>
                  <Input id="location" {...register('location')} placeholder="e.g. Sports Field" />
                  {errors.location && <p className="text-xs text-destructive">{errors.location.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="photoUrl">Photo URL (optional)</Label>
                  <Input id="photoUrl" {...register('photoUrl')} placeholder="https://..." />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Logging...' : 'Log Item'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
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
          value={String(lostReports)}
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
          <DataTable
            columns={foundColumns}
            data={foundItems}
            searchKey="name"
            searchPlaceholder="Search found items..."
          />
        </TabsContent>

        <TabsContent value="lost">
          <div className="space-y-4">
            <DataTable
              columns={lostColumns}
              data={mockLostReports}
              searchKey="itemName"
              searchPlaceholder="Search lost reports..."
            />
            {/* Match suggestions for open reports */}
            {openReports.map((report) => (
              <MatchSuggestionsPanel key={report.id} report={report} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="matched">
          <DataTable
            columns={foundColumns}
            data={matchedItems}
            searchKey="name"
            searchPlaceholder="Search matched items..."
          />
        </TabsContent>

        <TabsContent value="archived">
          <DataTable
            columns={foundColumns}
            data={archivedItems}
            searchKey="name"
            searchPlaceholder="Search archived items..."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
