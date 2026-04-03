'use client';

import { use, useMemo } from 'react';
import { format } from 'date-fns';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { ResolutionCard } from '@/components/sgb';
import { useSgbMeetingDetail } from '@/hooks/useSgbMeetings';
import { useSgbResolutions, useSgbResolutionMutations } from '@/hooks/useSgbResolutions';
import { useAuthStore } from '@/stores/useAuthStore';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, MapPin, Clock, FileText } from 'lucide-react';
import { toast } from 'sonner';
import type { SgbVoteChoice } from '@/types';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function SgbMeetingDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const { user } = useAuthStore();
  const { meeting, loading } = useSgbMeetingDetail(id);
  const { resolutions, loading: resLoading, refetch } = useSgbResolutions({ meetingId: id });
  const { castVote } = useSgbResolutionMutations();

  const userId = user?.id ?? '';

  const handleVote = useMemo(() => async (resolutionId: string, vote: SgbVoteChoice) => {
    try {
      await castVote(resolutionId, vote);
      toast.success('Vote recorded');
      refetch();
    } catch (err: unknown) {
      console.error('Vote failed', err);
      toast.error('Failed to record vote');
    }
  }, [castVote, refetch]);

  if (loading || resLoading) return <LoadingSpinner />;
  if (!meeting) return <EmptyState icon={CalendarDays} title="Meeting not found" />;

  return (
    <div className="space-y-6">
      <PageHeader title={meeting.title}>
        <Badge variant="outline">{meeting.status.replace('_', ' ')}</Badge>
        <Badge variant="outline">{meeting.type === 'annual_general' ? 'AGM' : meeting.type}</Badge>
      </PageHeader>

      {/* Meeting info */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-6 text-sm">
            <span className="flex items-center gap-1">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              {format(new Date(meeting.date), 'dd MMMM yyyy, HH:mm')}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              {meeting.venue}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Agenda */}
      {meeting.agenda.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" /> Agenda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2">
              {meeting.agenda.map((item, idx) => (
                <li key={idx} className="flex items-start gap-3 text-sm">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium">{item.title}</p>
                    <div className="text-xs text-muted-foreground flex gap-3">
                      {item.presenter && <span>Presenter: {item.presenter}</span>}
                      {item.duration && <span>{item.duration} min</span>}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Minutes */}
      {meeting.minutes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" /> Minutes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{meeting.minutes}</p>
          </CardContent>
        </Card>
      )}

      {/* Resolutions */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Resolutions</h2>
        {resolutions.length === 0 ? (
          <EmptyState title="No resolutions" description="No resolutions have been created for this meeting." />
        ) : (
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            {resolutions.map((res) => (
              <ResolutionCard
                key={res.id}
                resolution={res}
                userId={userId}
                onVote={handleVote}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
