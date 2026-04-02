import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type { GeneratedPaper, GradingJob } from '@/components/ai-tools/types';

interface ActivityItem {
  id: string;
  action: string;
  detail: string;
  time: string;
  type: 'create' | 'grade';
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

export function useTeacherAIToolsDashboard() {
  const [papers, setPapers] = useState<GeneratedPaper[]>([]);
  const [gradingJobs] = useState<GradingJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const papersRes = await apiClient.get('/ai-tools/papers', {
          params: { limit: 50 },
        });
        const raw = unwrapResponse(papersRes);
        const list = raw.papers ?? (Array.isArray(raw) ? raw : []);
        setPapers(list as GeneratedPaper[]);
      } catch {
        // silently handle
      }
      setLoading(false);
    }
    loadData();
  }, []);

  const paperCount = papers.length;
  const pendingReviews = gradingJobs.filter(
    (j) => j.status === 'completed',
  ).length;

  const recentActivity: ActivityItem[] = papers.slice(0, 5).map((p) => ({
    id: p.id,
    action: 'Generated paper',
    detail: `Grade ${p.grade} ${p.subject} -- ${p.topic}`,
    time: timeAgo(p.createdAt),
    type: 'create' as const,
  }));

  return {
    papers,
    gradingJobs,
    loading,
    paperCount,
    pendingReviews,
    recentActivity,
  };
}

export type { ActivityItem };
