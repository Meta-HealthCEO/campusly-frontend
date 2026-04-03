'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { FileText, ExternalLink, Calendar, User, Clock } from 'lucide-react';
import type { Policy, PolicyCategory } from '@/types';

interface PolicyDetailViewProps {
  policy: Policy;
}

const CATEGORY_LABELS: Record<PolicyCategory, string> = {
  hr: 'HR',
  academic: 'Academic',
  safety: 'Safety',
  financial: 'Financial',
  governance: 'Governance',
  general: 'General',
};

type BadgeVariant = 'secondary' | 'default' | 'destructive' | 'outline';

const CATEGORY_VARIANTS: Record<PolicyCategory, BadgeVariant> = {
  hr: 'secondary',
  academic: 'default',
  safety: 'destructive',
  financial: 'outline',
  governance: 'secondary',
  general: 'outline',
};

const STATUS_VARIANTS: Record<string, BadgeVariant> = {
  draft: 'outline',
  active: 'default',
  under_review: 'secondary',
  archived: 'outline',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  active: 'Active',
  under_review: 'Under Review',
  archived: 'Archived',
};

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function resolveDisplayName(
  value?: string | { id: string; firstName: string; lastName: string },
): string {
  if (!value) return '—';
  if (typeof value === 'string') return value;
  return `${value.firstName} ${value.lastName}`;
}

export function PolicyDetailView({ policy }: PolicyDetailViewProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <CardTitle className="text-xl truncate">{policy.title}</CardTitle>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge variant={CATEGORY_VARIANTS[policy.category]}>
                {CATEGORY_LABELS[policy.category]}
              </Badge>
              <Badge variant={STATUS_VARIANTS[policy.status] ?? 'outline'}>
                {STATUS_LABELS[policy.status] ?? policy.status}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <dt className="text-muted-foreground">Version:</dt>
              <dd className="font-medium">v{policy.version}</dd>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <dt className="text-muted-foreground">Review Date:</dt>
              <dd className="font-medium">{formatDate(policy.reviewDate)}</dd>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <dt className="text-muted-foreground">Last Reviewed:</dt>
              <dd className="font-medium">{formatDate(policy.lastReviewedAt)}</dd>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <dt className="text-muted-foreground">Reviewed By:</dt>
              <dd className="font-medium truncate">
                {resolveDisplayName(policy.lastReviewedBy)}
              </dd>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <dt className="text-muted-foreground">Created By:</dt>
              <dd className="font-medium truncate">
                {resolveDisplayName(policy.createdBy)}
              </dd>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <dt className="text-muted-foreground">Created:</dt>
              <dd className="font-medium">{formatDate(policy.createdAt)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {policy.fileUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Attached File</CardTitle>
          </CardHeader>
          <CardContent>
            <a
              href={policy.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-primary hover:underline text-sm"
            >
              <ExternalLink className="h-4 w-4" />
              View Document
            </a>
          </CardContent>
        </Card>
      )}

      {policy.content && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Policy Content</CardTitle>
          </CardHeader>
          <CardContent>
            <Separator className="mb-4" />
            <div className="prose prose-sm max-w-none text-sm leading-relaxed whitespace-pre-wrap">
              {policy.content}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
