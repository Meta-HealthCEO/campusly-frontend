'use client';

import { useState, useCallback } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { DocumentList, DocumentUploadDialog } from '@/components/sgb';
import { useSgbDocuments, useSgbDocumentMutations } from '@/hooks/useSgbDocuments';
import { useAuthStore } from '@/stores/useAuthStore';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';

export default function SgbDocumentsPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const [category, setCategory] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);

  const { documents, loading, refetch, schoolId } = useSgbDocuments(category);
  const { uploadDocument, deleteDocument, downloadDocument } = useSgbDocumentMutations();

  const handleUpload = useCallback(async (formData: FormData) => {
    await uploadDocument(formData);
    toast.success('Document uploaded successfully');
    refetch();
  }, [uploadDocument, refetch]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Delete this document?')) return;
    await deleteDocument(id);
    toast.success('Document deleted');
    refetch();
  }, [deleteDocument, refetch]);

  const handleDownload = useCallback((id: string) => {
    const url = downloadDocument(id);
    window.open(url, '_blank');
  }, [downloadDocument]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="Document Repository" description="SGB policies, reports, and governance documents">
        <div className="flex items-center gap-2">
          <Select value={category} onValueChange={(val: unknown) => setCategory(val as string)}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="policy">Policy</SelectItem>
              <SelectItem value="financial_statement">Financial Statement</SelectItem>
              <SelectItem value="audit_report">Audit Report</SelectItem>
              <SelectItem value="minutes">Minutes</SelectItem>
              <SelectItem value="constitution">Constitution</SelectItem>
              <SelectItem value="annual_report">Annual Report</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          {isAdmin && (
            <Button onClick={() => setDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-1" /> Upload
            </Button>
          )}
        </div>
      </PageHeader>

      <DocumentList
        documents={documents}
        isAdmin={isAdmin}
        onDownload={handleDownload}
        onDelete={isAdmin ? handleDelete : undefined}
      />

      {isAdmin && (
        <DocumentUploadDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleUpload}
          schoolId={schoolId}
        />
      )}
    </div>
  );
}
