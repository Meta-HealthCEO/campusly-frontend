'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ConsentStatusBadge } from './ConsentStatusBadge';
import { ArrowLeft, CheckCircle2, XCircle, Clock, Users } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import apiClient from '@/lib/api-client';
import type { ApiConsentForm, ApiConsentResponse } from './types';
import { normalizeConsentResponse } from './types';

interface ConsentResponsesPanelProps {
  form: ApiConsentForm;
  onBack: () => void;
}

export function ConsentResponsesPanel({ form, onBack }: ConsentResponsesPanelProps) {
  const [responses, setResponses] = useState<ApiConsentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchResponses = useCallback(async () => {
    try {
      const res = await apiClient.get(
        `/consent/responses/form/${form.id}`,
        { params: { page, limit: 20 } },
      );
      const raw = res.data.data ?? res.data;
      const arr = Array.isArray(raw)
        ? raw
        : (raw.responses ?? raw.data ?? []);
      const items = (arr as Record<string, unknown>[]).map(normalizeConsentResponse);
      setResponses(items);
      setTotal(typeof raw.total === 'number' ? raw.total : items.length);
      setTotalPages(typeof raw.totalPages === 'number' ? raw.totalPages : 1);
    } catch {
      console.error('Failed to load consent responses');
    } finally {
      setLoading(false);
    }
  }, [form.id, page]);

  useEffect(() => {
    fetchResponses();
  }, [fetchResponses]);

  const grantedCount = responses.filter((r) => r.response === 'granted').length;
  const deniedCount = responses.filter((r) => r.response === 'denied').length;
  const targetCount = form.targetStudents.length;
  const outstandingCount = Math.max(0, targetCount - total);

  function getStudentName(r: ApiConsentResponse): string {
    if (typeof r.studentId === 'object' && r.studentId !== null) {
      return `${r.studentId.firstName} ${r.studentId.lastName}`;
    }
    return String(r.studentId);
  }

  function getParentName(r: ApiConsentResponse): string {
    if (typeof r.parentId === 'object' && r.parentId !== null) {
      return `${r.parentId.firstName} ${r.parentId.lastName}`;
    }
    return String(r.parentId);
  }

  function getParentEmail(r: ApiConsentResponse): string {
    if (typeof r.parentId === 'object' && r.parentId !== null) {
      return r.parentId.email;
    }
    return '';
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div>
          <h2 className="text-lg font-semibold">{form.title}</h2>
          <p className="text-sm text-muted-foreground">Response details</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-xl bg-blue-100 p-2.5">
              <Users className="h-5 w-5 text-blue-700" />
            </div>
            <div>
              <p className="text-2xl font-bold">{targetCount}</p>
              <p className="text-sm text-muted-foreground">Targeted</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-xl bg-emerald-100 p-2.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-700" />
            </div>
            <div>
              <p className="text-2xl font-bold">{grantedCount}</p>
              <p className="text-sm text-muted-foreground">Granted</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-xl bg-red-100 p-2.5">
              <XCircle className="h-5 w-5 text-red-700" />
            </div>
            <div>
              <p className="text-2xl font-bold">{deniedCount}</p>
              <p className="text-sm text-muted-foreground">Denied</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-xl bg-amber-100 p-2.5">
              <Clock className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <p className="text-2xl font-bold">{outstandingCount}</p>
              <p className="text-sm text-muted-foreground">Outstanding</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {responses.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No responses have been recorded yet.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Student</th>
                <th className="px-4 py-3 text-left font-medium">Parent</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Response</th>
                <th className="px-4 py-3 text-left font-medium">Signed At</th>
                <th className="px-4 py-3 text-left font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {responses.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="px-4 py-3">{getStudentName(r)}</td>
                  <td className="px-4 py-3">{getParentName(r)}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {getParentEmail(r)}
                  </td>
                  <td className="px-4 py-3">
                    <ConsentStatusBadge status={r.response} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {r.signedAt ? formatDate(r.signedAt) : '-'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">
                    {r.notes || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {responses.some((r) => r.signature) && (
        <div className="text-xs text-muted-foreground">
          <Badge variant="outline" className="text-xs mr-1">Audit</Badge>
          Signatures and IP addresses are recorded for compliance.
        </div>
      )}
    </div>
  );
}
