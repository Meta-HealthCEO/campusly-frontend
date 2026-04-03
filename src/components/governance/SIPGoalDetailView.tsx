'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  Target, Calendar, User, Star, Upload, MessageSquarePlus,
  ExternalLink, Clock,
} from 'lucide-react';
import type { SIPGoal, SIPEvidence, SIPReview, GoalStatus, GoalPriority } from '@/types';

interface SIPGoalDetailViewProps {
  goal: SIPGoal;
  evidence: SIPEvidence[];
  reviews: SIPReview[];
  onAddEvidence: () => void;
  onAddReview: () => void;
}

type BadgeVariant = 'secondary' | 'default' | 'destructive' | 'outline';

const STATUS_LABELS: Record<GoalStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed: 'Completed',
  overdue: 'Overdue',
};

const STATUS_VARIANTS: Record<GoalStatus, BadgeVariant> = {
  not_started: 'outline',
  in_progress: 'secondary',
  completed: 'default',
  overdue: 'destructive',
};

const PRIORITY_LABELS: Record<GoalPriority, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

const PRIORITY_VARIANTS: Record<GoalPriority, BadgeVariant> = {
  high: 'destructive',
  medium: 'secondary',
  low: 'outline',
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

function EvidenceGallery({ evidence }: { evidence: SIPEvidence[] }) {
  if (evidence.length === 0) {
    return (
      <EmptyState
        icon={Upload}
        title="No evidence yet"
        description="Upload evidence files to support this goal."
      />
    );
  }

  return (
    <ul className="space-y-2">
      {evidence.map((item) => (
        <li key={item.id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{item.title}</p>
            <p className="text-xs text-muted-foreground">
              {resolveDisplayName(item.uploadedBy)} &mdash;{' '}
              {formatDate(item.createdAt)}
              {item.fileType && ` · ${item.fileType}`}
            </p>
          </div>
          <a
            href={item.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 text-primary hover:underline"
            aria-label={`View ${item.title}`}
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </li>
      ))}
    </ul>
  );
}

function ReviewTimeline({ reviews }: { reviews: SIPReview[] }) {
  if (reviews.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title="No reviews yet"
        description="Add a quarterly review to track progress."
      />
    );
  }

  return (
    <ul className="space-y-3">
      {reviews.map((review) => (
        <li key={review.id} className="rounded-lg border p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-sm">
              Q{review.quarter} {review.year}
            </span>
            <Badge variant="outline">{review.completionPercent}% complete</Badge>
          </div>
          <Progress value={review.completionPercent} className="h-1.5" />
          <p className="text-sm text-muted-foreground leading-relaxed">{review.notes}</p>
          <p className="text-xs text-muted-foreground">
            Reviewed by {resolveDisplayName(review.reviewedBy)} &mdash;{' '}
            {formatDate(review.createdAt)}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function SIPGoalDetailView({
  goal,
  evidence,
  reviews,
  onAddEvidence,
  onAddReview,
}: SIPGoalDetailViewProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <CardTitle className="text-xl">{goal.title}</CardTitle>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge variant={STATUS_VARIANTS[goal.status]}>
                {STATUS_LABELS[goal.status]}
              </Badge>
              <Badge variant={PRIORITY_VARIANTS[goal.priority]}>
                {PRIORITY_LABELS[goal.priority]}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {goal.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {goal.description}
            </p>
          )}
          <Separator />
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <dt className="text-muted-foreground">WSE Area:</dt>
              <dd className="font-medium">{goal.wseArea}</dd>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <dt className="text-muted-foreground">Responsible:</dt>
              <dd className="font-medium truncate">
                {resolveDisplayName(goal.responsiblePersonId)}
              </dd>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <dt className="text-muted-foreground">Target Date:</dt>
              <dd className="font-medium">{formatDate(goal.targetDate)}</dd>
            </div>
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <dt className="text-muted-foreground">Completion:</dt>
              <dd className="font-medium">{goal.completionPercent}%</dd>
            </div>
          </dl>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Overall progress</span>
              <span className="font-medium">{goal.completionPercent}%</span>
            </div>
            <Progress value={goal.completionPercent} className="h-2" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">
              Evidence ({evidence.length})
            </CardTitle>
            <Button size="sm" variant="outline" onClick={onAddEvidence} className="gap-1">
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Add Evidence</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <EvidenceGallery evidence={evidence} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">
              Reviews ({reviews.length})
            </CardTitle>
            <Button size="sm" variant="outline" onClick={onAddReview} className="gap-1">
              <MessageSquarePlus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Review</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ReviewTimeline reviews={reviews} />
        </CardContent>
      </Card>
    </div>
  );
}
