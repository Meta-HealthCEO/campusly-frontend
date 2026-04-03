'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ApplicationStatusBadge } from './ApplicationStatusBadge';
import { StatusTimeline } from './StatusTimeline';
import { Search } from 'lucide-react';
import type { AdmissionStatusCheckResponse } from '@/types/admissions';

function gradeLabel(grade: number): string {
  return grade === 0 ? 'Grade R' : `Grade ${grade}`;
}

interface Props {
  onCheck: (token: string) => Promise<AdmissionStatusCheckResponse | null>;
  checking: boolean;
  error: string | null;
  result: AdmissionStatusCheckResponse | null;
}

export function PublicStatusChecker({ onCheck, checking, error, result }: Props) {
  const [token, setToken] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (token.trim()) {
      onCheck(token.trim());
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Check Application Status</CardTitle>
          <CardDescription>
            Enter the tracking token you received when you submitted your application.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
            <Input
              value={token}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setToken(e.target.value)}
              placeholder="Enter tracking token (e.g. a1b2c3d4e5f6)"
              className="flex-1"
            />
            <Button type="submit" disabled={checking || !token.trim()}>
              <Search className="h-4 w-4 mr-2" />
              {checking ? 'Checking...' : 'Check Status'}
            </Button>
          </form>
          {error && <p className="text-sm text-destructive mt-3">{error}</p>}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{result.applicantName}</CardTitle>
            <CardDescription>
              {result.applicationNumber} - {gradeLabel(result.gradeApplyingFor)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Current Status:</span>
              <ApplicationStatusBadge status={result.status} />
            </div>
            {result.interviewDate && (
              <div className="text-sm">
                <span className="text-muted-foreground">Interview:</span>{' '}
                {new Date(result.interviewDate).toLocaleString('en-ZA')}
                {result.interviewVenue && <> at {result.interviewVenue}</>}
              </div>
            )}
            <div>
              <h4 className="text-sm font-medium mb-2">Timeline</h4>
              <StatusTimeline history={result.statusHistory.map((h) => ({
                status: h.status,
                date: h.date,
              }))} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
