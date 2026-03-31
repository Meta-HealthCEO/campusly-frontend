'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Save, FileText, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { formatDate } from '@/lib/utils';

interface SubmissionData {
  id: string;
  homeworkId: string;
  studentId: {
    _id: string;
    userId: { firstName: string; lastName: string; email: string };
  };
  files: string[];
  submittedAt: string;
  isLate: boolean;
  mark: number | null;
  feedback: string | null;
  gradedAt: string | null;
  gradedBy: { _id: string; firstName: string; lastName: string } | string | null;
}

interface GradingInterfaceProps {
  submission: SubmissionData;
  totalMarks: number;
  onGraded: (updatedSubmission: SubmissionData) => void;
}

export function GradingInterface({ submission, totalMarks, onGraded }: GradingInterfaceProps) {
  const [mark, setMark] = useState<string>(
    submission.mark !== null && submission.mark !== undefined
      ? String(submission.mark)
      : ''
  );
  const [feedback, setFeedback] = useState<string>(submission.feedback ?? '');
  const [saving, setSaving] = useState(false);

  const studentName = submission.studentId?.userId
    ? `${submission.studentId.userId.firstName} ${submission.studentId.userId.lastName}`
    : 'Unknown Student';

  const isGraded = submission.mark !== null && submission.mark !== undefined;

  const handleSave = async () => {
    const markNum = Number(mark);
    if (isNaN(markNum) || markNum < 0) {
      toast.error('Mark must be a number >= 0');
      return;
    }
    if (markNum > totalMarks) {
      toast.error(`Mark cannot exceed total marks (${totalMarks})`);
      return;
    }

    setSaving(true);
    try {
      const body: { mark: number; feedback?: string } = { mark: markNum };
      if (feedback.trim()) body.feedback = feedback.trim();
      const res = await apiClient.patch(
        `/homework/submissions/${submission.id}/grade`,
        body
      );
      const updated = res.data.data ?? res.data;
      toast.success('Submission graded successfully');
      onGraded({ ...submission, ...updated, id: updated._id ?? updated.id ?? submission.id });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to grade submission';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">{studentName}</p>
          <p className="text-xs text-muted-foreground">
            Submitted: {formatDate(submission.submittedAt, 'dd MMM yyyy, HH:mm')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {submission.isLate && (
            <Badge variant="destructive">
              <AlertTriangle className="mr-1 h-3 w-3" />
              Late
            </Badge>
          )}
          <Badge variant={isGraded ? 'default' : 'secondary'}>
            {isGraded ? 'Graded' : 'Pending'}
          </Badge>
        </div>
      </div>

      {submission.files.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Files</p>
          {submission.files.map((file, i) => (
            <a
              key={i}
              href={file}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <FileText className="h-3 w-3" />
              {file.split('/').pop() ?? `File ${i + 1}`}
            </a>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Mark (out of {totalMarks})
          </label>
          <Input
            type="number"
            min={0}
            max={totalMarks}
            value={mark}
            onChange={(e) => setMark(e.target.value)}
            placeholder={`0-${totalMarks}`}
            className="w-28"
          />
        </div>
        <div className="flex-1 space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Feedback
          </label>
          <Textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Write feedback..."
            className="min-h-[60px]"
          />
        </div>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving || !mark}
        >
          <Save className="mr-1 h-3 w-3" />
          {saving ? 'Saving...' : isGraded ? 'Re-grade' : 'Save'}
        </Button>
      </div>

      {isGraded && submission.gradedAt && (
        <p className="text-xs text-muted-foreground">
          Graded on {formatDate(submission.gradedAt, 'dd MMM yyyy, HH:mm')}
        </p>
      )}
    </div>
  );
}
