'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  FileCheck, FilePen, Clock, CheckCircle2, XCircle, AlertTriangle,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { mockConsentForms } from '@/lib/mock-data';
import type { ConsentForm } from '@/types';

const statusStyles: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  signed: 'bg-emerald-100 text-emerald-800',
  declined: 'bg-red-100 text-red-800',
};

const statusIcons: Record<string, React.ElementType> = {
  pending: Clock,
  signed: CheckCircle2,
  declined: XCircle,
};

export default function ConsentPage() {
  const [forms, setForms] = useState<ConsentForm[]>(mockConsentForms);

  const pendingForms = forms.filter((f) => f.status === 'pending');
  const completedForms = forms.filter((f) => f.status !== 'pending');

  const handleSign = (formId: string) => {
    setForms((prev) =>
      prev.map((f) =>
        f.id === formId
          ? { ...f, status: 'signed' as const, signedAt: new Date().toISOString() }
          : f
      )
    );
  };

  const handleDecline = (formId: string) => {
    setForms((prev) =>
      prev.map((f) =>
        f.id === formId ? { ...f, status: 'declined' as const } : f
      )
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Consent Forms"
        description="Review and sign consent forms for your children's school activities."
      />

      {/* Summary Cards */}
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
              <p className="text-2xl font-bold">
                {forms.filter((f) => f.status === 'signed').length}
              </p>
              <p className="text-sm text-muted-foreground">Signed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-xl bg-red-100 p-2.5">
              <XCircle className="h-5 w-5 text-red-700" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {forms.filter((f) => f.status === 'declined').length}
              </p>
              <p className="text-sm text-muted-foreground">Declined</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Consent Forms */}
      <div>
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          Pending Consent Forms
        </h2>
        {pendingForms.length > 0 ? (
          <div className="space-y-3">
            {pendingForms.map((form) => {
              const StatusIcon = statusIcons[form.status] ?? Clock;
              return (
                <Card key={form.id}>
                  <CardContent className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <FilePen className="h-5 w-5 text-primary" />
                          <h3 className="font-medium">{form.title}</h3>
                          <Badge
                            variant="secondary"
                            className={statusStyles[form.status] ?? ''}
                          >
                            {form.status.charAt(0).toUpperCase() +
                              form.status.slice(1)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {form.description}
                        </p>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          <span>Due by {formatDate(form.dueDate)}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDecline(form.id)}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Decline
                        </Button>
                        <Button onClick={() => handleSign(form.id)}>
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Sign
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={FileCheck}
            title="All caught up"
            description="You have no pending consent forms to review."
          />
        )}
      </div>

      {/* Completed Forms */}
      {completedForms.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3">Completed Forms</h2>
          <div className="space-y-2">
            {completedForms.map((form) => {
              const StatusIcon = statusIcons[form.status] ?? Clock;
              return (
                <Card key={form.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <StatusIcon
                          className={`h-5 w-5 ${
                            form.status === 'signed'
                              ? 'text-emerald-600'
                              : 'text-red-600'
                          }`}
                        />
                        <div>
                          <p className="font-medium text-sm">{form.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {form.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          variant="secondary"
                          className={statusStyles[form.status] ?? ''}
                        >
                          {form.status.charAt(0).toUpperCase() +
                            form.status.slice(1)}
                        </Badge>
                        {form.signedAt && (
                          <span className="text-xs text-muted-foreground">
                            {formatDate(form.signedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
