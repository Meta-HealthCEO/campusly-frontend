'use client';

import { useState } from 'react';
import { Plus, PackageSearch, Eye, LayoutGrid, List, Bell } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { mockFoundItems, mockLostReports, mockStudents } from '@/lib/mock-data';
import { lostReportSchema, type LostReportFormData } from '@/lib/validations';
import { formatDate } from '@/lib/utils';
import type { FoundItem, LostReport } from '@/types';

const parentChildren = mockStudents.slice(0, 2);

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

const lostStatusStyles: Record<string, string> = {
  open: 'bg-amber-100 text-amber-800',
  matched: 'bg-blue-100 text-blue-800',
  resolved: 'bg-emerald-100 text-emerald-800',
  closed: 'bg-gray-100 text-gray-500',
};

const myReportColumns: ColumnDef<LostReport>[] = [
  {
    accessorKey: 'itemName',
    header: 'Item',
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
    header: 'Child',
  },
  {
    accessorKey: 'locationLost',
    header: 'Location',
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
];

function ClaimDialog({ item }: { item: FoundItem }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        This is mine!
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Claim Item</DialogTitle>
          <DialogDescription>
            Are you sure &ldquo;{item.name}&rdquo; belongs to your child? The school will verify your claim.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg bg-muted/50 p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Item</span>
            <span className="font-medium">{item.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Found at</span>
            <span>{item.location}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Date Found</span>
            <span>{formatDate(item.dateFound)}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              toast.success(`Claim submitted for "${item.name}". The school will contact you.`);
              setOpen(false);
            }}
          >
            Confirm Claim
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FoundItemCard({ item }: { item: FoundItem }) {
  return (
    <Card className="overflow-hidden">
      {item.photoUrl && (
        <div className="aspect-square w-full bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.photoUrl}
            alt={item.name}
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <CardContent className="p-4 space-y-3">
        <div>
          <h3 className="font-medium text-sm">{item.name}</h3>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {item.description}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className={categoryStyles[item.category] ?? ''}>
            {categoryLabels[item.category] ?? item.category}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {item.location}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {formatDate(item.dateFound)}
          </span>
          {item.status === 'unclaimed' && <ClaimDialog item={item} />}
          {item.status === 'claimed' && (
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
              Claimed
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ParentLostFoundPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'gallery' | 'list'>('gallery');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LostReportFormData>({
    resolver: zodResolver(lostReportSchema),
  });

  const onSubmit = async (data: LostReportFormData) => {
    console.log('New lost report:', data);
    toast.success('Lost item report submitted! We\'ll notify you if there\'s a match.');
    reset();
    setDialogOpen(false);
  };

  const browsableItems = mockFoundItems.filter(
    (i) => i.status === 'unclaimed' || i.status === 'claimed'
  );

  const filteredItems =
    categoryFilter === 'all'
      ? browsableItems
      : browsableItems.filter((i) => i.category === categoryFilter);

  const matchedReports = mockLostReports.filter((r) => r.status === 'matched');

  const foundListColumns: ColumnDef<FoundItem>[] = [
    {
      accessorKey: 'name',
      header: 'Item',
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
      header: 'Location',
    },
    {
      accessorKey: 'dateFound',
      header: 'Date Found',
      cell: ({ row }) => formatDate(row.original.dateFound),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        if (row.original.status === 'unclaimed') {
          return <ClaimDialog item={row.original} />;
        }
        return (
          <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
            Claimed
          </Badge>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Lost & Found" description="Report lost items and browse found items.">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="mr-2 h-4 w-4" />
            Report Lost Item
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Report Lost Item</DialogTitle>
              <DialogDescription>
                Describe the item your child has lost. We&apos;ll notify you if a match is found.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>Child</Label>
                <Select onValueChange={(val: unknown) => setValue('studentId', val as string)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select child" />
                  </SelectTrigger>
                  <SelectContent>
                    {parentChildren.map((child) => (
                      <SelectItem key={child.id} value={child.id}>
                        {child.user.firstName} {child.user.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.studentId && <p className="text-xs text-destructive">{errors.studentId.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="itemName">Item Name</Label>
                <Input id="itemName" {...register('itemName')} placeholder="e.g. Blue Pencil Case" />
                {errors.itemName && <p className="text-xs text-destructive">{errors.itemName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" {...register('description')} placeholder="Describe the item..." />
                {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select onValueChange={(val: unknown) => setValue('category', val as LostReportFormData['category'])}>
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
                  <Label htmlFor="dateLost">Date Lost</Label>
                  <Input id="dateLost" type="date" {...register('dateLost')} />
                  {errors.dateLost && <p className="text-xs text-destructive">{errors.dateLost.message}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="locationLost">Where they think they lost it</Label>
                <Input id="locationLost" {...register('locationLost')} placeholder="e.g. Playground" />
                {errors.locationLost && <p className="text-xs text-destructive">{errors.locationLost.message}</p>}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting...' : 'Submit Report'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* Match notification */}
      {matchedReports.length > 0 && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Bell className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-900">Match Found!</p>
                <p className="text-sm text-blue-700 mt-1">
                  {matchedReports.length} of your lost item report{matchedReports.length > 1 ? 's have' : ' has'} been matched
                  with found items. Please visit the school office to collect.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* My Lost Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">My Lost Reports</CardTitle>
          <CardDescription>
            Track the status of items your children have lost.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={myReportColumns}
            data={mockLostReports}
            searchKey="itemName"
            searchPlaceholder="Search reports..."
          />
        </CardContent>
      </Card>

      {/* Browse Found Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base">Browse Found Items</CardTitle>
              <CardDescription>
                Items found at school. Claim yours by clicking &ldquo;This is mine!&rdquo;
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select defaultValue="all" onValueChange={(val: unknown) => setCategoryFilter(val as string)}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="clothing">Clothing</SelectItem>
                  <SelectItem value="stationery">Stationery</SelectItem>
                  <SelectItem value="lunch_box">Lunch Box</SelectItem>
                  <SelectItem value="electronics">Electronics</SelectItem>
                  <SelectItem value="sports">Sports</SelectItem>
                  <SelectItem value="bags">Bags</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex rounded-lg border">
                <Button
                  variant={viewMode === 'gallery' ? 'secondary' : 'ghost'}
                  size="icon-sm"
                  onClick={() => setViewMode('gallery')}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="icon-sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === 'gallery' ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredItems.map((item) => (
                <FoundItemCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <DataTable
              columns={foundListColumns}
              data={filteredItems}
              searchKey="name"
              searchPlaceholder="Search found items..."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
