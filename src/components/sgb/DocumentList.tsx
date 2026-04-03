'use client';

import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, Trash2, FileText } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import type { SgbDocument, SgbDocumentCategory } from '@/types';

interface DocumentListProps {
  documents: SgbDocument[];
  isAdmin: boolean;
  onDownload: (id: string) => void;
  onDelete?: (id: string) => void;
}

const CATEGORY_LABEL: Record<SgbDocumentCategory, string> = {
  policy: 'Policy',
  financial_statement: 'Financial Statement',
  audit_report: 'Audit Report',
  minutes: 'Minutes',
  constitution: 'Constitution',
  annual_report: 'Annual Report',
  other: 'Other',
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export function DocumentList({ documents, isAdmin, onDownload, onDelete }: DocumentListProps) {
  if (documents.length === 0) {
    return <EmptyState icon={FileText} title="No documents" description="No documents have been uploaded to the repository." />;
  }

  return (
    <div className="space-y-2">
      {documents.map((doc) => {
        const uploadedByName = typeof doc.uploadedBy === 'object'
          ? `${doc.uploadedBy.firstName} ${doc.uploadedBy.lastName}`
          : undefined;

        return (
          <Card key={doc.id}>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <h4 className="font-medium truncate">{doc.title}</h4>
                    <Badge variant="outline">{CATEGORY_LABEL[doc.category]}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-3">
                    <span>{doc.fileName}</span>
                    <span>{formatFileSize(doc.fileSize)}</span>
                    <span>{format(new Date(doc.createdAt), 'dd MMM yyyy')}</span>
                    {uploadedByName && <span>by {uploadedByName}</span>}
                  </div>
                  {doc.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{doc.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => onDownload(doc.id)}>
                    <Download className="h-4 w-4 mr-1" /> Download
                  </Button>
                  {isAdmin && onDelete && (
                    <Button size="sm" variant="outline" onClick={() => onDelete(doc.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
