'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { Eye, Trash2, X as Cancel, FileSearch } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { usePaperImport } from '@/hooks/usePaperImport';
import { toast } from 'sonner';
import type { PaperImportJob, PaperImportJobStatus } from '@/types';

const STATUS_VARIANT: Record<
  PaperImportJobStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  pending: 'outline',
  running: 'secondary',
  completed: 'default',
  failed: 'destructive',
  cancelled: 'outline',
};

const TABS: Array<{ value: string; label: string; filter?: PaperImportJobStatus }> = [
  { value: 'all', label: 'All' },
  { value: 'in_progress', label: 'In Progress', filter: 'running' },
  { value: 'completed', label: 'Completed', filter: 'completed' },
  { value: 'failed', label: 'Failed', filter: 'failed' },
];

export function JobListTable() {
  const { listJobs, cancelJob, deleteJob } = usePaperImport();
  const [jobs, setJobs] = useState<PaperImportJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  const load = useCallback(
    async (tab: string) => {
      setLoading(true);
      try {
        const tabDef = TABS.find((t) => t.value === tab);
        const result = await listJobs({ status: tabDef?.filter });
        setJobs(result.items);
      } catch (err: unknown) {
        console.error('Failed to load import jobs', err);
      } finally {
        setLoading(false);
      }
    },
    [listJobs],
  );

  useEffect(() => {
    void load(activeTab);
  }, [activeTab, load]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const handleCancel = async (jobId: string) => {
    try {
      await cancelJob(jobId);
      toast.success('Cancelled');
      await load(activeTab);
    } catch (err: unknown) {
      console.error('Failed to cancel job', err);
      toast.error('Could not cancel this import.');
    }
  };

  const handleDelete = async (jobId: string) => {
    if (!confirm('Delete this import? Source files will be removed.')) return;
    try {
      await deleteJob(jobId);
      toast.success('Deleted');
      await load(activeTab);
    } catch (err: unknown) {
      console.error('Failed to delete job', err);
      toast.error('Could not delete this import.');
    }
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange}>
      <TabsList className="flex-wrap">
        {TABS.map((t) => (
          <TabsTrigger key={t.value} value={t.value}>
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value={activeTab} className="mt-4">
        {loading ? (
          <LoadingSpinner />
        ) : jobs.length === 0 ? (
          <EmptyState
            icon={FileSearch}
            title="No imports yet"
            description="Convert your first paper to digital from the wizard."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-3 py-2">Created</th>
                  <th className="px-3 py-2">File</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Pages</th>
                  <th className="px-3 py-2">Resources</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.id} className="border-b">
                    <td className="px-3 py-2 text-xs">
                      {new Date(j.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 max-w-xs truncate">{j.source.filename}</td>
                    <td className="px-3 py-2">
                      <Badge variant={STATUS_VARIANT[j.status]}>{j.status}</Badge>
                    </td>
                    <td className="px-3 py-2">{j.source.pageCount}</td>
                    <td className="px-3 py-2">{j.resultResourceIds.length}</td>
                    <td className="px-3 py-2 text-right space-x-1">
                      <Link
                        href={`/teacher/curriculum/import/${j.id}`}
                        className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      {(j.status === 'pending' || j.status === 'running') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => void handleCancel(j.id)}
                        >
                          <Cancel className="h-4 w-4" />
                        </Button>
                      )}
                      {(j.status === 'completed' ||
                        j.status === 'failed' ||
                        j.status === 'cancelled') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => void handleDelete(j.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
