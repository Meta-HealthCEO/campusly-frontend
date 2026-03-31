'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { SchoolProfileCard, SubscriptionBadge } from '@/components/school';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { CheckCircle2, Circle } from 'lucide-react';
import { MODULES } from '@/lib/constants';
import { useSchoolStore } from '@/stores/useSchoolStore';

export default function SchoolDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { school, schoolLoading, schoolError, fetchSchool, updateSchool, deleteSchool } =
    useSchoolStore();

  const [statusPending, setStatusPending] = useState(false);
  const [deletePending, setDeletePending] = useState(false);

  useEffect(() => {
    fetchSchool(id);
  }, [id, fetchSchool]);

  const handleToggleStatus = async () => {
    if (!school) return;
    setStatusPending(true);
    try {
      const newActive = !school.isActive;
      await updateSchool(id, { isActive: newActive });
      await fetchSchool(id);
      toast.success(`${school.name} has been ${newActive ? 'activated' : 'suspended'}.`);
    } catch {
      toast.error('Failed to update school status.');
    } finally {
      setStatusPending(false);
    }
  };

  const handleDelete = async () => {
    if (!school) return;
    setDeletePending(true);
    try {
      await deleteSchool(id);
      toast.success(`${school.name} has been deleted.`);
      router.push('/superadmin/schools');
    } catch {
      toast.error('Failed to delete school.');
      setDeletePending(false);
    }
  };

  if (schoolLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-muted-foreground">Loading school...</p>
      </div>
    );
  }

  if (schoolError || !school || school.id !== id) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-muted-foreground text-lg">
          {schoolError ?? 'School not found.'}
        </p>
        <Button variant="outline" onClick={() => router.push('/superadmin/schools')}>
          Back to Schools
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/superadmin/schools')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader
          title={school.name}
          description={`${school.address.city}, ${school.address.province}`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SchoolProfileCard school={school} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {school.subscription ? (
              <>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Plan</p>
                  <SubscriptionBadge
                    tier={school.subscription.tier}
                    expiresAt={school.subscription.expiresAt}
                  />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Expires</p>
                  <p className="font-medium text-sm">
                    {new Date(school.subscription.expiresAt).toLocaleDateString()}
                  </p>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No subscription data.</p>
            )}

            <div className="pt-2 space-y-2">
              <Dialog>
                <DialogTrigger
                  render={
                    <Button
                      variant={school.isActive ? 'destructive' : 'default'}
                      size="sm"
                      className="w-full"
                    />
                  }
                >
                  {school.isActive ? 'Suspend School' : 'Activate School'}
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {school.isActive ? 'Suspend' : 'Activate'} School
                    </DialogTitle>
                    <DialogDescription>
                      {school.isActive
                        ? `Are you sure you want to suspend ${school.name}? Users will lose access.`
                        : `Are you sure you want to activate ${school.name}?`}
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button
                      variant={school.isActive ? 'destructive' : 'default'}
                      onClick={handleToggleStatus}
                      disabled={statusPending}
                    >
                      {statusPending
                        ? 'Saving...'
                        : school.isActive
                        ? 'Suspend'
                        : 'Activate'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog>
                <DialogTrigger
                  render={
                    <Button variant="outline" size="sm" className="w-full text-destructive" />
                  }
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete School
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete School</DialogTitle>
                    <DialogDescription>
                      This action is permanent. All data for{' '}
                      <strong>{school.name}</strong> will be deleted. This cannot be
                      undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={deletePending}
                    >
                      {deletePending ? 'Deleting...' : 'Delete Permanently'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Enabled Modules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {MODULES.map((mod) => {
              const enabled = school.modulesEnabled.includes(mod.id);
              return (
                <div key={mod.id} className="flex items-center gap-3 rounded-lg border p-3">
                  {enabled ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{mod.name}</p>
                    <p className="text-xs text-muted-foreground">{mod.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Academic Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-muted/50 p-4 text-center">
              <p className="text-2xl font-bold">{school.settings?.academicYear ?? '—'}</p>
              <p className="text-xs text-muted-foreground mt-1">Academic Year</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-4 text-center">
              <p className="text-2xl font-bold">{school.settings?.terms ?? '—'}</p>
              <p className="text-xs text-muted-foreground mt-1">Terms</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-4 text-center">
              <p className="text-2xl font-bold capitalize">
                {school.settings?.gradingSystem ?? '—'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Grading</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
