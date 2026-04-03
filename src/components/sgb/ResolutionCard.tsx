'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown, Minus } from 'lucide-react';
import type { SgbResolution, SgbResolutionStatus, SgbVoteChoice } from '@/types';

interface ResolutionCardProps {
  resolution: SgbResolution;
  userId: string;
  onVote: (resolutionId: string, vote: SgbVoteChoice) => void;
  voting?: boolean;
}

const STATUS_VARIANT: Record<SgbResolutionStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  proposed: 'default',
  passed: 'secondary',
  rejected: 'destructive',
  deferred: 'outline',
};

export function ResolutionCard({ resolution, userId, onVote, voting }: ResolutionCardProps) {
  const userVote = resolution.voterRecords.find((r) => r.voterId === userId);
  const canVote = resolution.status === 'proposed' && resolution.requiresVote;
  const totalVotes = resolution.votes.for + resolution.votes.against + resolution.votes.abstain;

  const meetingTitle = typeof resolution.meetingId === 'object'
    ? resolution.meetingId.title
    : undefined;

  const proposedByName = typeof resolution.proposedBy === 'object'
    ? `${resolution.proposedBy.firstName} ${resolution.proposedBy.lastName}`
    : undefined;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base truncate">{resolution.title}</CardTitle>
            <div className="flex flex-wrap gap-2 mt-1">
              <Badge variant={STATUS_VARIANT[resolution.status]}>{resolution.status}</Badge>
              <Badge variant="outline">{resolution.category}</Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {resolution.description && (
          <p className="text-sm text-muted-foreground line-clamp-3">{resolution.description}</p>
        )}
        {meetingTitle && (
          <p className="text-xs text-muted-foreground">Meeting: {meetingTitle}</p>
        )}
        {proposedByName && (
          <p className="text-xs text-muted-foreground">Proposed by: {proposedByName}</p>
        )}

        {/* Vote tally */}
        <div className="flex items-center gap-4 text-sm">
          <span className="text-emerald-600 font-medium">For: {resolution.votes.for}</span>
          <span className="text-destructive font-medium">Against: {resolution.votes.against}</span>
          <span className="text-muted-foreground">Abstain: {resolution.votes.abstain}</span>
          <span className="text-xs text-muted-foreground ml-auto">Total: {totalVotes}</span>
        </div>

        {/* Voting buttons */}
        {canVote && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            <Button
              size="sm"
              variant={userVote?.vote === 'for' ? 'default' : 'outline'}
              onClick={() => onVote(resolution.id, 'for')}
              disabled={voting}
            >
              <ThumbsUp className="h-4 w-4 mr-1" /> For
            </Button>
            <Button
              size="sm"
              variant={userVote?.vote === 'against' ? 'destructive' : 'outline'}
              onClick={() => onVote(resolution.id, 'against')}
              disabled={voting}
            >
              <ThumbsDown className="h-4 w-4 mr-1" /> Against
            </Button>
            <Button
              size="sm"
              variant={userVote?.vote === 'abstain' ? 'secondary' : 'outline'}
              onClick={() => onVote(resolution.id, 'abstain')}
              disabled={voting}
            >
              <Minus className="h-4 w-4 mr-1" /> Abstain
            </Button>
          </div>
        )}

        {userVote && (
          <p className="text-xs text-muted-foreground">Your vote: <strong>{userVote.vote}</strong></p>
        )}
      </CardContent>
    </Card>
  );
}
