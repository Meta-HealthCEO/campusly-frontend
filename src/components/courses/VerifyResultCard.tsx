'use client';

import { CheckCircle2, XCircle, Award } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import type { VerifyCertificateResult } from '@/types';

interface VerifyResultCardProps {
  result: VerifyCertificateResult;
  code: string;
}

export function VerifyResultCard({ result, code }: VerifyResultCardProps) {
  if (!result.valid) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-8 flex flex-col items-center text-center gap-4">
          <div className="rounded-full bg-destructive/10 p-4 ring-4 ring-destructive/20">
            <XCircle className="h-12 w-12 text-destructive" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Certificate Not Found</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              The verification code{' '}
              <code className="rounded bg-muted px-2 py-0.5 font-mono text-xs">{code}</code>{' '}
              does not match any certificate issued through Campusly. Double-check
              the code or contact the issuing school if you believe this is an error.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-br from-primary/10 via-background to-primary/5 px-6 py-10 flex flex-col items-center text-center gap-4">
        <div className="rounded-full bg-primary/10 p-4 ring-4 ring-primary/20">
          <Award className="h-16 w-16 text-primary" />
        </div>
        <Badge variant="secondary" className="gap-1">
          <CheckCircle2 className="h-3 w-3 text-primary" />
          Verified
        </Badge>
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Certificate Verified</h2>
          <p className="text-sm text-muted-foreground">
            This certificate was issued through Campusly.
          </p>
        </div>
      </div>

      <CardContent className="space-y-4 pt-6">
        <Field label="Student" value={result.studentName} />
        <Field label="Course" value={result.courseName} />
        <Field label="School" value={result.schoolName} />
        <Field label="Issued On" value={formatDate(result.issuedAt)} />
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">Verification Code</p>
          <code className="mt-1 inline-block rounded bg-muted px-2 py-0.5 font-mono text-xs">
            {code}
          </code>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-right truncate">{value}</p>
    </div>
  );
}
