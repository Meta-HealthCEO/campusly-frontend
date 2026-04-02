'use client';

import { useState, useEffect, useCallback } from 'react';
import { MapPin, Tag, Lightbulb } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

interface HotspotData {
  byLocation: Array<{ location: string; count: number }>;
  byCategory: Array<{ category: string; count: number }>;
  byMonth: Array<{ _id: { year: number; month: number }; count: number }>;
}

interface HotspotReportProps {
  fetchHotspotReport: () => Promise<HotspotData>;
}

function formatCategory(cat: string): string {
  return cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function HotspotReport({ fetchHotspotReport }: HotspotReportProps) {
  const [data, setData] = useState<HotspotData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await fetchHotspotReport();
    setData(result);
    setLoading(false);
  }, [fetchHotspotReport]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner />;

  if (!data || (data.byLocation.length === 0 && data.byCategory.length === 0)) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Not enough data for a hotspot report yet.
        </CardContent>
      </Card>
    );
  }

  const maxLocation = data.byLocation[0]?.count ?? 1;
  const maxCategory = data.byCategory[0]?.count ?? 1;
  const topLocation = data.byLocation[0]?.location;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        {/* Top Locations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4" /> Top Loss Locations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.byLocation.map((loc) => (
              <div key={loc.location} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="truncate">{loc.location}</span>
                  <span className="font-medium">{loc.count}</span>
                </div>
                <Progress value={(loc.count / maxLocation) * 100} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Top Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Tag className="h-4 w-4" /> Top Categories
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.byCategory.map((cat) => (
              <div key={cat.category} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="truncate">{formatCategory(cat.category)}</span>
                  <span className="font-medium">{cat.count}</span>
                </div>
                <Progress value={(cat.count / maxCategory) * 100} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      {topLocation && (
        <Card>
          <CardContent className="flex items-start gap-3 p-4">
            <Lightbulb className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{topLocation}</span>{' '}
              is the most common loss location with {data.byLocation[0].count} reports.
              Consider adding labelling hooks or a dedicated lost property bin in this area.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
