'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Card, CardContent } from '@/components/ui/card';
import { useAssetReports } from '@/hooks/useAssetReports';
import { useAssetMaintenance } from '@/hooks/useAssetMaintenance';
import {
  AssetSummaryCards,
  AssetAlertBanner,
  MaintenanceList,
} from '@/components/assets';
import {
  Package,
  FolderTree,
  MapPin,
  ArrowLeftRight,
  Wrench,
  AlertTriangle,
  Shield,
  BarChart3,
  QrCode,
} from 'lucide-react';

const quickLinks = [
  { label: 'Asset Register', href: '/admin/assets/register', icon: Package },
  { label: 'Categories', href: '/admin/assets/categories', icon: FolderTree },
  { label: 'Locations', href: '/admin/assets/locations', icon: MapPin },
  { label: 'Check-Outs', href: '/admin/assets/check-outs', icon: ArrowLeftRight },
  { label: 'Maintenance', href: '/admin/assets/maintenance', icon: Wrench },
  { label: 'Incidents', href: '/admin/assets/incidents', icon: AlertTriangle },
  { label: 'Insurance', href: '/admin/assets/insurance', icon: Shield },
  { label: 'Reports', href: '/admin/assets/reports', icon: BarChart3 },
  { label: 'QR Labels', href: '/admin/assets/qr-labels', icon: QrCode },
];

export default function AssetDashboardPage() {
  const { summary, loading: summaryLoading, fetchSummary } = useAssetReports();
  const { upcoming, loading: maintenanceLoading, fetchUpcoming } = useAssetMaintenance();

  useEffect(() => {
    fetchSummary();
    fetchUpcoming(30);
  }, [fetchSummary, fetchUpcoming]);

  if (summaryLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Asset Management"
        description="Track, maintain, and manage all school assets"
      />

      {summary && <AssetSummaryCards summary={summary} />}

      <AssetAlertBanner summary={summary} />

      <div>
        <h2 className="text-base font-semibold mb-3">Quick Links</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {quickLinks.map(({ label, href, icon: Icon }) => (
            <Link key={href} href={href}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                <CardContent className="flex flex-col items-center justify-center gap-2 py-5 px-3 text-center">
                  <Icon className="h-6 w-6 text-primary" />
                  <span className="text-sm font-medium leading-tight">{label}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-base font-semibold mb-3">Upcoming Maintenance (Next 30 Days)</h2>
        {maintenanceLoading ? (
          <LoadingSpinner />
        ) : (
          <MaintenanceList records={upcoming} compact />
        )}
      </div>
    </div>
  );
}
