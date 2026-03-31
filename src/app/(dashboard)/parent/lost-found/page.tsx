'use client';

import { useState, useMemo } from 'react';
import { Plus, Bell, LayoutGrid, List } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { useCurrentParent } from '@/hooks/useCurrentParent';
import { useParentLostFound } from '@/hooks/useParentLostFound';
import { FoundItemCard, ClaimDialog } from '@/components/parent/FoundItemCard';
import { lostReportSchema, type LostReportFormData } from '@/lib/validations';
import { formatDate } from '@/lib/utils';
import type { FoundItem, LostReport } from '@/types';

const categoryLabels: Record<string, string> = {
  clothing: 'Clothing', stationery: 'Stationery', lunch_box: 'Lunch Box',
  electronics: 'Electronics', sports: 'Sports', bags: 'Bags', other: 'Other',
};
const categoryStyles: Record<string, string> = {
  clothing: 'bg-blue-100 text-blue-800', stationery: 'bg-purple-100 text-purple-800',
  lunch_box: 'bg-orange-100 text-orange-800', electronics: 'bg-slate-100 text-slate-800',
  sports: 'bg-green-100 text-green-800', bags: 'bg-rose-100 text-rose-800',
  other: 'bg-gray-100 text-gray-800',
};
const lostStatusStyles: Record<string, string> = {
  open: 'bg-amber-100 text-amber-800', matched: 'bg-blue-100 text-blue-800',
  resolved: 'bg-emerald-100 text-emerald-800', closed: 'bg-gray-100 text-gray-500',
};

const myReportColumns: ColumnDef<LostReport>[] = [
  { accessorKey: 'itemName', header: 'Item', cell: ({ row }) => <span className="font-medium">{row.original.itemName}</span> },
  { id: 'category', header: 'Category', accessorKey: 'category', cell: ({ row }) => <Badge variant="secondary" className={categoryStyles[row.original.category] ?? ''}>{categoryLabels[row.original.category] ?? row.original.category}</Badge> },
  { accessorKey: 'studentName', header: 'Child' },
  { accessorKey: 'locationLost', header: 'Location' },
  { accessorKey: 'dateLost', header: 'Date Lost', cell: ({ row }) => formatDate(row.original.dateLost) },
  { id: 'status', header: 'Status', accessorKey: 'status', cell: ({ row }) => <Badge variant="secondary" className={lostStatusStyles[row.original.status] ?? ''}>{row.original.status.charAt(0).toUpperCase() + row.original.status.slice(1)}</Badge> },
];

export default function ParentLostFoundPage() {
  const { children, loading: parentLoading } = useCurrentParent();
  const childIdSet = useMemo(() => new Set(children.map((c) => c.id)), [children]);
  const { foundItems, lostReports, loading, submitLostReport } = useParentLostFound(childIdSet);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'gallery' | 'list'>('gallery');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<LostReportFormData>({ resolver: zodResolver(lostReportSchema) });

  const onSubmit = async (data: LostReportFormData) => {
    try {
      await submitLostReport(data as unknown as Record<string, unknown>);
      toast.success('Lost item report submitted! We\'ll notify you if there\'s a match.');
    } catch {
      toast.error('Failed to submit report.');
    }
    reset();
    setDialogOpen(false);
  };

  const browsableItems = foundItems.filter((i) => i.status === 'unclaimed' || i.status === 'claimed');
  const filteredItems = categoryFilter === 'all' ? browsableItems : browsableItems.filter((i) => i.category === categoryFilter);
  const matchedReports = lostReports.filter((r) => r.status === 'matched');

  const foundListColumns: ColumnDef<FoundItem>[] = [
    { accessorKey: 'name', header: 'Item', cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { id: 'category', header: 'Category', accessorKey: 'category', cell: ({ row }) => <Badge variant="secondary" className={categoryStyles[row.original.category] ?? ''}>{categoryLabels[row.original.category] ?? row.original.category}</Badge> },
    { accessorKey: 'location', header: 'Location' },
    { accessorKey: 'dateFound', header: 'Date Found', cell: ({ row }) => formatDate(row.original.dateFound) },
    { id: 'actions', header: '', cell: ({ row }) => row.original.status === 'unclaimed' ? <ClaimDialog item={row.original} /> : <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">Claimed</Badge> },
  ];

  if (loading || parentLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="Lost & Found" description="Report lost items and browse found items.">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button />}><Plus className="mr-2 h-4 w-4" />Report Lost Item</DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Report Lost Item</DialogTitle>
              <DialogDescription>Describe the item your child has lost. We&apos;ll notify you if a match is found.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>Child</Label>
                <Select onValueChange={(val: unknown) => setValue('studentId', val as string)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select child" /></SelectTrigger>
                  <SelectContent>
                    {children.map((child) => {
                      const firstName = child.user?.firstName ?? child.firstName ?? '';
                      const lastName = child.user?.lastName ?? child.lastName ?? '';
                      return (
                        <SelectItem key={child.id} value={child.id}>
                          {firstName} {lastName}
                        </SelectItem>
                      );
                    })}
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
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select category" /></SelectTrigger>
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
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Submitting...' : 'Submit Report'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {matchedReports.length > 0 && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Bell className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-900">Match Found!</p>
                <p className="text-sm text-blue-700 mt-1">
                  {matchedReports.length} of your lost item report{matchedReports.length > 1 ? 's have' : ' has'} been matched with found items. Please visit the school office to collect.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">My Lost Reports</CardTitle>
          <CardDescription>Track the status of items your children have lost.</CardDescription>
        </CardHeader>
        <CardContent>
          {lostReports.length > 0 ? (
            <DataTable columns={myReportColumns} data={lostReports} searchKey="itemName" searchPlaceholder="Search reports..." />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No lost reports submitted yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base">Browse Found Items</CardTitle>
              <CardDescription>Items found at school. Claim yours by clicking &ldquo;This is mine!&rdquo;</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select defaultValue="all" onValueChange={(val: unknown) => setCategoryFilter(val as string)}>
                <SelectTrigger><SelectValue placeholder="Filter by category" /></SelectTrigger>
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
                <Button variant={viewMode === 'gallery' ? 'secondary' : 'ghost'} size="icon-sm" onClick={() => setViewMode('gallery')}><LayoutGrid className="h-4 w-4" /></Button>
                <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon-sm" onClick={() => setViewMode('list')}><List className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredItems.length > 0 ? (
            viewMode === 'gallery' ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredItems.map((item) => <FoundItemCard key={item.id} item={item} />)}
              </div>
            ) : (
              <DataTable columns={foundListColumns} data={filteredItems} searchKey="name" searchPlaceholder="Search found items..." />
            )
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No found items to display.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
