'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';
import { useAssets } from '@/hooks/useAssets';
import { useAssetCheckOuts } from '@/hooks/useAssetCheckOuts';
import { useAssetMaintenance } from '@/hooks/useAssetMaintenance';
import { useAssetIncidents } from '@/hooks/useAssetIncidents';
import {
  AssignmentDialog,
  CheckOutDialog,
  CheckInDialog,
  CheckOutList,
  MaintenanceList,
  MaintenanceFormDialog,
  IncidentList,
  IncidentFormDialog,
} from '@/components/assets';
import type {
  Asset,
  AssignPayload,
  CheckOutPayload,
  CheckInPayload,
  CreateMaintenancePayload,
  CreateAssetIncidentPayload,
} from '@/types';
import { formatCurrency } from '@/lib/utils';

function InfoGrid({ asset }: { asset: Asset }) {
  const fields: [string, string | number | undefined | null][] = [
    ['Asset Tag', asset.assetTag],
    ['Serial Number', asset.serialNumber],
    ['Make', asset.make],
    ['Model', asset.model],
    ['Category', typeof asset.categoryId === 'object' ? (asset.categoryId as { name?: string }).name : asset.categoryId],
    ['Location', typeof asset.locationId === 'object' ? (asset.locationId as { name?: string }).name : asset.locationId],
    ['Status', asset.status],
    ['Condition', asset.condition],
    ['Purchase Price', asset.purchasePrice != null ? formatCurrency(asset.purchasePrice) : '—'],
    ['Purchase Date', asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString() : '—'],
    ['Warranty Expiry', asset.warrantyExpiry ? new Date(asset.warrantyExpiry).toLocaleDateString() : '—'],
    ['Vendor', asset.vendor],
    ['Portable', asset.isPortable ? 'Yes' : 'No'],
    ['Assigned To', asset.assignedTo ? (typeof asset.assignedTo === 'object' ? `${asset.assignedTo.firstName} ${asset.assignedTo.lastName}` : asset.assignedTo) : '—'],
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {fields.map(([label, value]) => (
        <div key={label} className="space-y-0.5">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm font-medium truncate">{value ?? '—'}</p>
        </div>
      ))}
    </div>
  );
}

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { fetchAsset, assignAsset, unassignAsset } = useAssets();
  const { checkOuts, loading: checkOutLoading, fetchCheckOuts, checkOut, checkIn } = useAssetCheckOuts();
  const { records: maintenanceRecords, loading: maintLoading, fetchByAsset, createMaintenance } = useAssetMaintenance();
  const { incidents, loading: incidentLoading, fetchIncidents, createIncident } = useAssetIncidents();

  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [assignOpen, setAssignOpen] = useState(false);
  const [checkOutOpen, setCheckOutOpen] = useState(false);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [maintOpen, setMaintOpen] = useState(false);
  const [incidentOpen, setIncidentOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAsset(id);
      setAsset(data);
    } finally {
      setLoading(false);
    }
  }, [fetchAsset, id]);

  useEffect(() => {
    load();
    fetchCheckOuts({ assetId: id });
    fetchByAsset(id);
    fetchIncidents({ assetId: id });
  }, [load, fetchCheckOuts, fetchByAsset, fetchIncidents, id]);

  const handleAssign = useCallback(async (data: AssignPayload) => {
    await assignAsset(id, data);
    setAssignOpen(false);
    await load();
  }, [assignAsset, id, load]);

  const handleUnassign = useCallback(async () => {
    await unassignAsset(id);
    await load();
  }, [unassignAsset, id, load]);

  const handleCheckOut = useCallback(async (data: CheckOutPayload) => {
    await checkOut(id, data);
    setCheckOutOpen(false);
    await fetchCheckOuts({ assetId: id });
  }, [checkOut, id, fetchCheckOuts]);

  const handleCheckIn = useCallback(async (data: CheckInPayload) => {
    await checkIn(id, data);
    setCheckInOpen(false);
    await fetchCheckOuts({ assetId: id });
  }, [checkIn, id, fetchCheckOuts]);

  const handleMaintenance = useCallback(async (data: CreateMaintenancePayload) => {
    await createMaintenance(id, data);
    setMaintOpen(false);
    await fetchByAsset(id);
  }, [createMaintenance, id, fetchByAsset]);

  const handleIncident = useCallback(async (data: CreateAssetIncidentPayload) => {
    await createIncident(id, data);
    setIncidentOpen(false);
    await fetchIncidents({ assetId: id });
  }, [createIncident, id, fetchIncidents]);

  if (loading) return <LoadingSpinner />;
  if (!asset) return <p className="p-6 text-muted-foreground">Asset not found.</p>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={asset.name}
        description={`Tag: ${asset.assetTag ?? '—'}`}
      >
        <div className="flex items-center gap-2">
          <Badge variant="outline">{asset.status}</Badge>
          <Badge variant="secondary">{asset.condition}</Badge>
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </div>
      </PageHeader>

      <Tabs defaultValue="info">
        <TabsList className="flex-wrap">
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="assignment">Assignment</TabsTrigger>
          <TabsTrigger value="checkouts">Check-Outs</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Asset Details</CardTitle></CardHeader>
            <CardContent><InfoGrid asset={asset} /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignment" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Assignment</CardTitle>
                <div className="flex gap-2">
                  {asset.assignedTo && (
                    <Button variant="outline" size="sm" onClick={handleUnassign}>
                      Unassign
                    </Button>
                  )}
                  <Button size="sm" onClick={() => setAssignOpen(true)}>
                    Assign
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {asset.assignedTo ? (
                <p className="text-sm">Currently assigned to: <strong>{typeof asset.assignedTo === 'object' ? `${asset.assignedTo.firstName} ${asset.assignedTo.lastName}` : asset.assignedTo}</strong></p>
              ) : (
                <p className="text-sm text-muted-foreground">Not currently assigned.</p>
              )}
            </CardContent>
          </Card>
          <AssignmentDialog
            open={assignOpen}
            onOpenChange={setAssignOpen}
            assetName={asset.name}
            onSubmit={handleAssign}
          />
        </TabsContent>

        <TabsContent value="checkouts" className="mt-4">
          <div className="flex justify-end mb-3 gap-2">
            <Button variant="outline" size="sm" onClick={() => setCheckInOpen(true)}>
              Check In
            </Button>
            <Button size="sm" onClick={() => setCheckOutOpen(true)}>
              Check Out
            </Button>
          </div>
          {checkOutLoading ? <LoadingSpinner /> : <CheckOutList checkOuts={checkOuts} />}
          <CheckOutDialog open={checkOutOpen} onOpenChange={setCheckOutOpen} assetName={asset.name} onSubmit={handleCheckOut} />
          <CheckInDialog open={checkInOpen} onOpenChange={setCheckInOpen} assetName={asset.name} onSubmit={handleCheckIn} />
        </TabsContent>

        <TabsContent value="maintenance" className="mt-4">
          <div className="flex justify-end mb-3">
            <Button size="sm" onClick={() => setMaintOpen(true)}>
              Log Maintenance
            </Button>
          </div>
          {maintLoading ? <LoadingSpinner /> : <MaintenanceList records={maintenanceRecords} />}
          <MaintenanceFormDialog
            open={maintOpen}
            onOpenChange={setMaintOpen}
            record={null}
            onSubmit={handleMaintenance}
          />
        </TabsContent>

        <TabsContent value="incidents" className="mt-4">
          <div className="flex justify-end mb-3">
            <Button size="sm" onClick={() => setIncidentOpen(true)}>
              Report Incident
            </Button>
          </div>
          {incidentLoading ? <LoadingSpinner /> : <IncidentList incidents={incidents} />}
          <IncidentFormDialog
            open={incidentOpen}
            onOpenChange={setIncidentOpen}
            incident={null}
            onSubmit={handleIncident}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
