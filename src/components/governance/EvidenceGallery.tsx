'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/EmptyState';
import { FileText, Image, Upload, ExternalLink } from 'lucide-react';
import type { SIPEvidence } from '@/types';

interface EvidenceGalleryProps {
  evidence: SIPEvidence[];
  onUpload?: () => void;
}

function isPDF(fileType?: string, fileUrl?: string): boolean {
  if (fileType) return fileType.toLowerCase().includes('pdf');
  if (fileUrl) return fileUrl.toLowerCase().endsWith('.pdf');
  return false;
}

function isImage(fileType?: string, fileUrl?: string): boolean {
  if (fileType) return fileType.toLowerCase().startsWith('image/');
  if (fileUrl) return /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(fileUrl);
  return false;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-ZA', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function resolveUploader(
  uploadedBy: SIPEvidence['uploadedBy'],
): string {
  if (typeof uploadedBy === 'string') return uploadedBy;
  return `${uploadedBy.firstName} ${uploadedBy.lastName}`;
}

export function EvidenceGallery({ evidence, onUpload }: EvidenceGalleryProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-medium">Evidence ({evidence.length})</h3>
        {onUpload && (
          <Button size="sm" variant="outline" onClick={onUpload}>
            <Upload className="h-4 w-4 mr-1.5" />
            Upload
          </Button>
        )}
      </div>

      {evidence.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No evidence attached"
          description="Upload files or images to support this goal."
        />
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {evidence.map((item) => {
            const pdf = isPDF(item.fileType, item.fileUrl);
            const img = isImage(item.fileType, item.fileUrl);

            return (
              <Card key={item.id} className="overflow-hidden">
                {img ? (
                  <div className="bg-muted h-32 flex items-center justify-center overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.fileUrl}
                      alt={item.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="bg-muted h-32 flex items-center justify-center">
                    {pdf ? (
                      <FileText className="h-12 w-12 text-muted-foreground" />
                    ) : (
                      <Image className="h-12 w-12 text-muted-foreground" />
                    )}
                  </div>
                )}
                <CardContent className="p-3 space-y-1">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {resolveUploader(item.uploadedBy)}
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</p>
                    <a
                      href={item.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      View <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
