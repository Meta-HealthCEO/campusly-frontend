'use client';

import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DigestPreferencesForm } from '@/components/digest/DigestPreferencesForm';
import { MorningDigestCard, EveningDigestCard, WeeklyDigestCard } from '@/components/digest/DigestPreview';
import { useDigestPreferences, useDigestPreview } from '@/hooks/useDigest';
import { useCurrentParent } from '@/hooks/useCurrentParent';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Eye } from 'lucide-react';

export default function ParentDigestPage() {
  const { preferences, loading: prefsLoading, updatePreferences } = useDigestPreferences();
  const { children, loading: childrenLoading } = useCurrentParent();
  const [selectedChildId, setSelectedChildId] = useState('');

  const effectiveChildId = useMemo(() => {
    if (selectedChildId) return selectedChildId;
    if (children.length > 0) return children[0].id;
    return '';
  }, [selectedChildId, children]);

  const {
    morningDigest, eveningDigest, weeklyDigest, loading: previewLoading,
    fetchMorning, fetchEvening, fetchWeekly,
  } = useDigestPreview(effectiveChildId);

  if (childrenLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="Daily Digest" description="Manage your digest preferences and preview summaries." />

      {/* Preferences */}
      <DigestPreferencesForm
        preferences={preferences}
        loading={prefsLoading}
        onUpdate={updatePreferences}
      />

      {/* Child selector + Preview */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Select Child</label>
            <Select
              value={effectiveChildId}
              onValueChange={(v: unknown) => setSelectedChildId(v as string)}
            >
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue placeholder="Choose a child" />
              </SelectTrigger>
              <SelectContent>
                {children.map((child) => {
                  const user = child.userId as unknown as { firstName?: string; lastName?: string } | undefined;
                  const name = user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : child.admissionNumber;
                  return (
                    <SelectItem key={child.id} value={child.id}>
                      {name || child.id}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="morning">
          <TabsList className="flex-wrap">
            <TabsTrigger value="morning">Morning</TabsTrigger>
            <TabsTrigger value="evening">Evening</TabsTrigger>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
          </TabsList>

          <TabsContent value="morning" className="space-y-3">
            <Button variant="outline" size="sm" onClick={fetchMorning} disabled={!effectiveChildId || previewLoading}>
              <Eye className="h-4 w-4 mr-2" />Preview Morning Digest
            </Button>
            <MorningDigestCard digest={morningDigest} loading={previewLoading} />
          </TabsContent>

          <TabsContent value="evening" className="space-y-3">
            <Button variant="outline" size="sm" onClick={fetchEvening} disabled={!effectiveChildId || previewLoading}>
              <Eye className="h-4 w-4 mr-2" />Preview Evening Digest
            </Button>
            <EveningDigestCard digest={eveningDigest} loading={previewLoading} />
          </TabsContent>

          <TabsContent value="weekly" className="space-y-3">
            <Button variant="outline" size="sm" onClick={fetchWeekly} disabled={!effectiveChildId || previewLoading}>
              <Eye className="h-4 w-4 mr-2" />Preview Weekly Digest
            </Button>
            <WeeklyDigestCard digest={weeklyDigest} loading={previewLoading} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
