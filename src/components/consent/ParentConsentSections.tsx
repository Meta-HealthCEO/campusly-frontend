'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConsentTypeBadge } from './ConsentTypeBadge';
import {
  FileCheck, FilePen, Clock, CheckCircle2, XCircle,
  AlertTriangle, ExternalLink,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { Student } from '@/types';
import type { ApiConsentForm } from './types';

interface PendingItem {
  form: ApiConsentForm;
  childId: string;
}

interface CompletedItem {
  form: ApiConsentForm;
  childId: string;
}

interface PendingSectionProps {
  items: PendingItem[];
  childrenList: Student[];
  onSign: (form: ApiConsentForm, childId: string) => void;
  onDecline: (form: ApiConsentForm, childId: string) => void;
}

export function PendingConsentSection({
  items, childrenList, onSign, onDecline,
}: PendingSectionProps) {
  return (
    <div>
      <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        Pending Consent Forms
      </h2>
      {items.length > 0 ? (
        <div className="space-y-3">
          {items.map(({ form, childId }) => {
            const child = childrenList.find((c) => c.id === childId);
            return (
              <Card key={`${form.id}-${childId}`}>
                <CardContent className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <FilePen className="h-5 w-5 text-primary" />
                        <h3 className="font-medium">{form.title}</h3>
                        <ConsentTypeBadge type={form.type} />
                      </div>
                      {form.description && (
                        <p className="text-sm text-muted-foreground">
                          {form.description}
                        </p>
                      )}
                      {child && (
                        <p className="text-xs text-muted-foreground">
                          For: {child.firstName ?? ''} {child.lastName ?? ''}
                        </p>
                      )}
                      <div className="flex items-center gap-3 flex-wrap">
                        {form.expiryDate && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            <span>Due by {formatDate(form.expiryDate)}</span>
                          </div>
                        )}
                        {form.attachmentUrl && (
                          <a
                            href={form.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Attachment
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        variant="outline"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => onDecline(form, childId)}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Decline
                      </Button>
                      <Button onClick={() => onSign(form, childId)}>
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
  );
}

interface CompletedSectionProps {
  items: CompletedItem[];
  childrenList: Student[];
}

export function CompletedConsentSection({ items, childrenList }: CompletedSectionProps) {
  return (
    <div>
      <h2 className="text-base font-semibold mb-3">Completed Forms</h2>
      <div className="space-y-2">
        {items.map(({ form, childId }) => {
          const child = childrenList.find((c) => c.id === childId);
          return (
            <Card key={`${form.id}-${childId}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <div>
                      <p className="font-medium text-sm">{form.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {child
                          ? `${child.firstName ?? ''} ${child.lastName ?? ''}`
                          : form.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ConsentTypeBadge type={form.type} />
                    <Badge
                      variant="secondary"
                      className="bg-emerald-100 text-emerald-800"
                    >
                      Responded
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
