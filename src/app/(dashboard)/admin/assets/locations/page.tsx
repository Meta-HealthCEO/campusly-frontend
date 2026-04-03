'use client';

import { useEffect, useState, useCallback } from 'react';
import { MapPin, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { useAssetLocations } from '@/hooks/useAssetLocations';
import { LocationList, LocationFormDialog } from '@/components/assets';
import type { AssetLocation, CreateLocationPayload } from '@/types';

export default function AssetLocationsPage() {
  const {
    locations,
    loading,
    fetchLocations,
    createLocation,
    updateLocation,
    deleteLocation,
  } = useAssetLocations();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<AssetLocation | null>(null);

  useEffect(() => { fetchLocations(); }, [fetchLocations]);

  const handleAdd = useCallback(() => {
    setEditingLocation(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((location: AssetLocation) => {
    setEditingLocation(location);
    setDialogOpen(true);
  }, []);

  const handleSubmit = useCallback(async (data: CreateLocationPayload) => {
    if (editingLocation) {
      await updateLocation(editingLocation.id, data);
    } else {
      await createLocation(data);
    }
    await fetchLocations();
    setDialogOpen(false);
  }, [editingLocation, createLocation, updateLocation, fetchLocations]);

  const handleDelete = useCallback(async (id: string) => {
    await deleteLocation(id);
    await fetchLocations();
  }, [deleteLocation, fetchLocations]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Asset Locations"
        description="Manage physical locations where assets are stored or used"
      >
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-1" /> Add Location
        </Button>
      </PageHeader>

      {locations.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No locations"
          description="Add your first asset location to start tracking where assets are kept."
        />
      ) : (
        <LocationList
          locations={locations}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      <LocationFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        location={editingLocation}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
