'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { Plus, Pencil, Trash2, Trophy, Users, Target } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import type { ReadingChallengeRecord, LeaderboardEntry } from '@/hooks/useLibrary';

interface ChallengeFormData {
  name: string;
  targetBooks: number;
  startDate: string;
  endDate: string;
  rewardPoints: number;
}

interface ChallengesTabProps {
  challenges: ReadingChallengeRecord[];
  loading: boolean;
  leaderboard: LeaderboardEntry[];
  leaderboardLoading: boolean;
  onCreateChallenge: (data: ChallengeFormData) => Promise<void>;
  onUpdateChallenge: (id: string, data: Record<string, unknown>) => Promise<void>;
  onDeleteChallenge: (id: string) => Promise<void>;
  onFetchLeaderboard: (challengeId: string) => Promise<void>;
  onRefresh: () => Promise<void>;
}

function getRankIcon(rank: number): string {
  if (rank === 1) return '\u{1F947}';
  if (rank === 2) return '\u{1F948}';
  if (rank === 3) return '\u{1F949}';
  return `#${rank}`;
}

function getChallengeStatus(c: ReadingChallengeRecord): 'active' | 'upcoming' | 'ended' {
  const now = new Date();
  if (new Date(c.startDate) > now) return 'upcoming';
  if (new Date(c.endDate) < now) return 'ended';
  return 'active';
}

export function ChallengesTab({
  challenges, loading, leaderboard, leaderboardLoading,
  onCreateChallenge, onUpdateChallenge, onDeleteChallenge,
  onFetchLeaderboard, onRefresh,
}: ChallengesTabProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editChallenge, setEditChallenge] = useState<ReadingChallengeRecord | null>(null);
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<ChallengeFormData>();

  const openCreate = () => {
    setEditChallenge(null);
    reset({ name: '', targetBooks: 5, startDate: '', endDate: '', rewardPoints: 0 });
    setFormOpen(true);
  };

  const openEdit = (c: ReadingChallengeRecord) => {
    setEditChallenge(c);
    reset({
      name: c.name,
      targetBooks: c.targetBooks,
      startDate: c.startDate.split('T')[0],
      endDate: c.endDate.split('T')[0],
      rewardPoints: c.rewardPoints,
    });
    setFormOpen(true);
  };

  const onSubmit = async (data: ChallengeFormData) => {
    try {
      if (editChallenge) {
        await onUpdateChallenge(editChallenge.id, data as unknown as Record<string, unknown>);
      } else {
        await onCreateChallenge(data);
      }
      setFormOpen(false);
      setEditChallenge(null);
      await onRefresh();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (editChallenge ? 'Failed to update challenge' : 'Failed to create challenge');
      toast.error(msg);
    }
  };

  const handleDelete = async (c: ReadingChallengeRecord) => {
    if (!confirm(`Delete challenge "${c.name}"?`)) return;
    try {
      await onDeleteChallenge(c.id);
      await onRefresh();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to delete challenge';
      toast.error(msg);
    }
  };

  const viewLeaderboard = (challengeId: string) => {
    setSelectedChallengeId(challengeId);
    onFetchLeaderboard(challengeId);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Create Challenge
        </Button>
      </div>

      {challenges.length === 0 ? (
        <EmptyState icon={Target} title="No Challenges" description="Create a reading challenge to get started." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {challenges.map((c) => {
            const status = getChallengeStatus(c);
            return (
              <Card key={c.id}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{c.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(c.startDate)} - {formatDate(c.endDate)}
                      </p>
                    </div>
                    <Badge variant={status === 'active' ? 'default' : status === 'upcoming' ? 'outline' : 'secondary'}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Target className="h-4 w-4" /> {c.targetBooks} books</span>
                    <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {c.participants.length} joined</span>
                    {c.rewardPoints > 0 && (
                      <span className="flex items-center gap-1"><Trophy className="h-4 w-4" /> {c.rewardPoints} pts</span>
                    )}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" size="sm" onClick={() => viewLeaderboard(c.id)}>
                      <Trophy className="mr-1 h-3 w-3" /> Leaderboard
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => openEdit(c)} aria-label="Edit challenge">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(c)} aria-label="Delete challenge">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Leaderboard panel */}
      {selectedChallengeId && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" /> Leaderboard
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setSelectedChallengeId(null)}>Close</Button>
            </div>
            {leaderboardLoading ? (
              <LoadingSpinner size="sm" />
            ) : leaderboard.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No entries yet.</p>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((entry, idx) => (
                  <div key={entry.studentId}
                    className="flex items-center justify-between rounded-lg border px-4 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold w-10 text-center">{getRankIcon(idx + 1)}</span>
                      <span className="font-medium">{entry.firstName} {entry.lastName}</span>
                    </div>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>{entry.booksCompleted} books</span>
                      <span>{entry.totalPages} pages</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Challenge form dialog */}
      <Dialog open={formOpen} onOpenChange={(v) => { setFormOpen(v); if (!v) setEditChallenge(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editChallenge ? 'Edit Challenge' : 'Create Challenge'}</DialogTitle>
            <DialogDescription>
              {editChallenge ? 'Update the reading challenge details.' : 'Create a new reading challenge for students.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" {...register('name', { required: 'Name is required' })} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetBooks">Target Books *</Label>
              <Input id="targetBooks" type="number"
                {...register('targetBooks', { required: 'Required', valueAsNumber: true, min: { value: 1, message: 'Min 1' } })}
              />
              {errors.targetBooks && <p className="text-xs text-destructive">{errors.targetBooks.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date *</Label>
                <Input id="startDate" type="date" {...register('startDate', { required: 'Required' })} />
                {errors.startDate && <p className="text-xs text-destructive">{errors.startDate.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date *</Label>
                <Input id="endDate" type="date" {...register('endDate', { required: 'Required' })} />
                {errors.endDate && <p className="text-xs text-destructive">{errors.endDate.message}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rewardPoints">Reward Points</Label>
              <Input id="rewardPoints" type="number"
                {...register('rewardPoints', { valueAsNumber: true, min: { value: 0, message: 'Min 0' } })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : editChallenge ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
