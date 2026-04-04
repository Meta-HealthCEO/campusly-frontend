'use client';

import { Settings, LayoutGrid, Users } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { SchoolGeneralTab } from '@/components/school/SchoolGeneralTab';
import { SchoolModulesTab } from '@/components/school/SchoolModulesTab';
import { SchoolUsersTab } from '@/components/school/SchoolUsersTab';
import { JoinCodeCard } from '@/components/shared/JoinCodeCard';
import { useSchool } from '@/hooks/useSchool';

export default function SettingsPage() {
  const { school, schoolLoading } = useSchool();

  if (schoolLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage school configuration and preferences" />

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">
            <Settings className="mr-1 h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="modules">
            <LayoutGrid className="mr-1 h-4 w-4" />
            Modules
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="mr-1 h-4 w-4" />
            Users
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-4">
          {school ? (
            <SchoolGeneralTab school={school} />
          ) : (
            <p className="text-sm text-muted-foreground">No school data available.</p>
          )}
        </TabsContent>

        <TabsContent value="modules" className="mt-4">
          {school ? (
            <SchoolModulesTab school={school} />
          ) : (
            <p className="text-sm text-muted-foreground">No school data available.</p>
          )}
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <div className="space-y-6">
            <JoinCodeCard />
            <SchoolUsersTab />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
