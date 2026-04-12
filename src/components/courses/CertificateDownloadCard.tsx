'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Award, Download, Copy, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import type { Certificate } from '@/types';

interface CertificateDownloadCardProps {
  certificate: Certificate;
  onDownload: () => void;
  downloading: boolean;
}

export function CertificateDownloadCard({
  certificate,
  onDownload,
  downloading,
}: CertificateDownloadCardProps) {
  const [copied, setCopied] = useState(false);

  const verifyUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/verify/certificate/${certificate.verificationCode}`
      : `/verify/certificate/${certificate.verificationCode}`;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(certificate.verificationCode);
      setCopied(true);
      toast.success('Verification code copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy to clipboard');
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(verifyUrl);
      toast.success('Verification link copied');
    } catch {
      toast.error('Could not copy to clipboard');
    }
  };

  return (
    <Card className="overflow-hidden">
      {/* Hero gradient section */}
      <div className="bg-gradient-to-br from-primary/10 via-background to-primary/5 px-6 py-10 flex flex-col items-center text-center gap-4">
        <div className="rounded-full bg-primary/10 p-4 ring-4 ring-primary/20">
          <Award className="h-16 w-16 text-primary" />
        </div>

        <div className="space-y-1">
          <Badge variant="secondary" className="mb-2">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Completed
          </Badge>
          <h2 className="text-2xl font-bold tracking-tight">Certificate of Completion</h2>
          <p className="text-xl font-semibold">{certificate.studentName}</p>
        </div>

        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Successfully completed</p>
          <p className="text-lg font-medium">{certificate.courseName}</p>
        </div>

        <p className="text-sm text-muted-foreground">
          Issued on {formatDate(certificate.issuedAt)}
        </p>
      </div>

      <CardContent className="space-y-6 pt-6">
        {/* Verification section */}
        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
          <p className="text-sm font-medium">Verification Code</p>
          <div className="flex items-center gap-2 flex-wrap">
            <code className="flex-1 rounded bg-muted px-3 py-1.5 font-mono text-sm truncate">
              {certificate.verificationCode}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyCode}
              className="shrink-0"
            >
              {copied ? (
                <CheckCircle2 className="h-4 w-4 text-primary" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              <span className="ml-1.5">{copied ? 'Copied' : 'Copy'}</span>
            </Button>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Shareable verification link</p>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="flex-1 text-xs text-muted-foreground truncate font-mono">
                {verifyUrl}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyUrl}
                className="shrink-0"
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy link
              </Button>
            </div>
          </div>
        </div>

        {/* Download button */}
        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={onDownload}
            disabled={downloading}
            className="w-full sm:w-auto"
          >
            <Download className="mr-2 h-5 w-5" />
            {downloading ? 'Downloading...' : 'Download Certificate'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
