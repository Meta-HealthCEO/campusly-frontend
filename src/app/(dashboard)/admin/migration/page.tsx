'use client';

import { useState } from 'react';
import { Database, Plus, History } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { MigrationWizard } from '@/components/migration/MigrationWizard';
import { JobHistoryTable } from '@/components/migration/JobHistoryTable';
import { useMigrationStore } from '@/stores/useMigrationStore';

export default function AdminMigrationPage() {
  const [activeTab, setActiveTab] = useState('new-import');
  const resetWizard = useMigrationStore((s) => s.resetWizard);

  const handleNewImport = () => {
    resetWizard();
    setActiveTab('new-import');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data Migration"
        description="Import historical data from external school management systems into Campusly."
      >
        <Button onClick={handleNewImport}>
          <Plus className="h-4 w-4" /> New Import
        </Button>
      </PageHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="new-import">
            <Database className="mr-1.5 h-4 w-4" /> New Import
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="mr-1.5 h-4 w-4" /> Import History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="new-import">
          <MigrationWizard />
        </TabsContent>

        <TabsContent value="history">
          <JobHistoryTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}
