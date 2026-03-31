'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import apiClient from '@/lib/api-client';
import type { SportPlayer, MvpTally } from '@/types/sport';

interface MvpVotePanelProps {
  fixtureId: string;
  schoolId: string;
  players: SportPlayer[];
  votes: MvpTally[];
  loading: boolean;
  onRefresh: () => void;
}

export function MvpVotePanel({
  fixtureId, schoolId, players, votes, loading, onRefresh,
}: MvpVotePanelProps) {
  const [voting, setVoting] = useState(false);

  const voteMap = new Map(votes.map((v) => [v.studentId, v.votes]));
  const maxVotes = votes.length > 0 ? Math.max(...votes.map((v) => v.votes)) : 0;

  async function castVote(studentId: string) {
    setVoting(true);
    try {
      await apiClient.post(`/sport/fixtures/${fixtureId}/mvp`, {
        studentId,
        schoolId,
      });
      toast.success('MVP vote cast!');
      onRefresh();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message ?? 'Failed to cast vote';
      toast.error(msg);
    } finally {
      setVoting(false);
    }
  }

  if (loading) return <LoadingSpinner size="sm" />;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold flex items-center gap-1">
        <Trophy className="h-4 w-4" /> MVP Voting
      </h4>
      {players.length === 0 ? (
        <p className="text-xs text-muted-foreground">No players to vote for.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {players.map((player) => {
            const count = voteMap.get(player._id) ?? 0;
            const isLeader = count > 0 && count === maxVotes;
            return (
              <div
                key={player._id}
                className={`flex flex-col items-center gap-1 rounded-lg border p-3 text-center transition-colors ${
                  isLeader ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20' : ''
                }`}
              >
                <span className="text-sm font-medium">
                  {player.firstName} {player.lastName}
                </span>
                <Badge variant="outline" className="text-xs">
                  {count} vote{count !== 1 ? 's' : ''}
                </Badge>
                <Button
                  size="sm"
                  variant={isLeader ? 'default' : 'outline'}
                  className="mt-1 w-full"
                  disabled={voting}
                  onClick={() => castVote(player._id)}
                >
                  Vote
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
