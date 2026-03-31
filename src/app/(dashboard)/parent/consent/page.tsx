'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ConsentSignDialog } from '@/components/consent/ConsentSignDialog';
import { ConsentDeclineDialog } from '@/components/consent/ConsentDeclineDialog';
import {
  PendingConsentSection,
  CompletedConsentSection,
} from '@/components/consent/ParentConsentSections';
import { useCurrentParent } from '@/hooks/useCurrentParent';
import { useParentConsent } from '@/hooks/useParentConsent';
import { Clock, CheckCircle2, FileCheck } from 'lucide-react';
import type { ApiConsentForm } from '@/components/consent/types';

export default function ParentConsentPage() {
  const { parent, children } = useCurrentParent();
  const { pendingForms, completedForms, loading, refetch } = useParentConsent();

  const [signForm, setSignForm] = useState<ApiConsentForm | null>(null);
  const [signChildId, setSignChildId] = useState('');
  const [declineForm, setDeclineForm] = useState<ApiConsentForm | null>(null);
  const [declineChildId, setDeclineChildId] = useState('');

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Consent Forms"
        description="Review and sign consent forms for your children's school activities."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-xl bg-amber-100 p-2.5">
              <Clock className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingForms.length}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-xl bg-emerald-100 p-2.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-700" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completedForms.length}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-xl bg-blue-100 p-2.5">
              <FileCheck className="h-5 w-5 text-blue-700" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {pendingForms.length + completedForms.length}
              </p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <PendingConsentSection
        items={pendingForms}
        childrenList={children}
        onSign={(form, childId) => {
          setSignForm(form);
          setSignChildId(childId);
        }}
        onDecline={(form, childId) => {
          setDeclineForm(form);
          setDeclineChildId(childId);
        }}
      />

      {completedForms.length > 0 && (
        <CompletedConsentSection
          items={completedForms}
          childrenList={children}
        />
      )}

      <ConsentSignDialog
        open={!!signForm}
        onOpenChange={(v) => { if (!v) setSignForm(null); }}
        form={signForm}
        parentId={parent?.id ?? ''}
        studentId={signChildId}
        onSuccess={refetch}
      />

      <ConsentDeclineDialog
        open={!!declineForm}
        onOpenChange={(v) => { if (!v) setDeclineForm(null); }}
        form={declineForm}
        parentId={parent?.id ?? ''}
        studentId={declineChildId}
        onSuccess={refetch}
      />
    </div>
  );
}
