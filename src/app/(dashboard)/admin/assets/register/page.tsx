'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Package, Plus } from 'lucide-react';
import { useAssets } from '@/hooks/useAssets';
import { useAssetCategories } from '@/hooks/useAssetCategories';
import { useAssetLocations } from '@/hooks/useAssetLocations';
import { AssetList, AssetFormDialog } from '@/components/assets';
import type { Asset, CreateAssetPayload } from '@/types';

const STATUS_OPTIONS = ['active', 'inactive', 'disposed', 'under_repair'];
const CONDITION_OPTIONS = ['excellent', 'good', 'fair', 'poor'];

export default function AssetRegisterPage() {
  const router = useRouter();
  const { assets, loading, fetchAssets, createAsset, updateAsset } = useAssets();
  const { flatCategories, loading: catLoading } = useAssetCategories();
  const { locations, fetchLocations } = useAssetLocations();

  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('all');
  const [locationId, setLocationId] = useState('all');
  const [status, setStatus] = useState('all');
  const [condition, setCondition] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const applyFilters = useCallback(() => {
    fetchAssets({
      search: search || undefined,
      categoryId: categoryId === 'all' ? undefined : categoryId,
      locationId: locationId === 'all' ? undefined : locationId,
      status: status === 'all' ? undefined : status,
      condition: condition === 'all' ? undefined : condition,
    });
  }, [fetchAssets, search, categoryId, locationId, status, condition]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const handleCreate = useCallback(async (data: CreateAssetPayload) => {
    await createAsset(data);
    await fetchAssets();
    setDialogOpen(false);
  }, [createAsset, fetchAssets]);

  const handleUpdate = useCallback(async (id: string, data: Partial<Asset>) => {
    await updateAsset(id, data);
    await fetchAssets();
    setDialogOpen(false);
    setEditingAsset(null);
  }, [updateAsset, fetchAssets]);

  const handleView = useCallback((id: string) => {
    router.push(`/admin/assets/register/${id}`);
  }, [router]);

  const handleEdit = useCallback((asset: Asset) => {
    setEditingAsset(asset);
    setDialogOpen(true);
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Asset Register" description="View and manage all school assets">
        <Button onClick={() => { setEditingAsset(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> New Asset
        </Button>
      </PageHeader>

      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <Input
          placeholder="Search assets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-56"
        />
        <Select value={categoryId} onValueChange={(v: unknown) => setCategoryId(v as string)}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {flatCategories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={locationId} onValueChange={(v: unknown) => setLocationId(v as string)}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            {locations.map((loc) => (
              <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v: unknown) => setStatus(v as string)}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={condition} onValueChange={(v: unknown) => setCondition(v as string)}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Condition" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Conditions</SelectItem>
            {CONDITION_OPTIONS.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading || catLoading ? (
        <LoadingSpinner />
      ) : assets.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No assets found"
          description="Add your first asset or adjust the filters."
        />
      ) : (
        <AssetList assets={assets} onView={handleView} />
      )}

      <AssetFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        asset={editingAsset}
        categories={flatCategories}
        locations={locations}
        onSubmit={handleCreate}
        onUpdate={handleUpdate}
      />
    </div>
  );
}
