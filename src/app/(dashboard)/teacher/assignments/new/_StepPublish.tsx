'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type {
  AssignmentLatePolicy,
  AssignmentSubmissionFormat,
} from '@/types/assignments';

const SUBMISSION_FORMAT_LABELS: Record<AssignmentSubmissionFormat, string> = {
  file: 'File upload only',
  text: 'Typed response only',
  both: 'File or typed response',
};

const LATE_POLICY_LABELS: Record<AssignmentLatePolicy, string> = {
  block:   'Block — late submissions rejected',
  penalty: 'Penalty — accept with mark deduction',
  accept:  'Accept — no penalty',
};

interface StepPublishProps {
  submissionFormat: AssignmentSubmissionFormat;
  setSubmissionFormat: (f: AssignmentSubmissionFormat) => void;
  latePolicy: AssignmentLatePolicy;
  setLatePolicy: (p: AssignmentLatePolicy) => void;
  latePenaltyPercent: number;
  setLatePenaltyPercent: (n: number) => void;
  gradebookAutoPublish: boolean;
  setGradebookAutoPublish: (b: boolean) => void;
}

export function StepPublish({
  submissionFormat, setSubmissionFormat, latePolicy, setLatePolicy,
  latePenaltyPercent, setLatePenaltyPercent, gradebookAutoPublish,
  setGradebookAutoPublish,
}: StepPublishProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Publishing options</CardTitle>
        <p className="text-sm text-muted-foreground">
          How students hand this in, and what happens after you mark it.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>Submission format</Label>
          <Select
            value={submissionFormat}
            onValueChange={(v: string | null) =>
              setSubmissionFormat((v ?? 'both') as AssignmentSubmissionFormat)
            }
          >
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(SUBMISSION_FORMAT_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Late policy</Label>
          <Select
            value={latePolicy}
            onValueChange={(v: string | null) =>
              setLatePolicy((v ?? 'block') as AssignmentLatePolicy)
            }
          >
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(LATE_POLICY_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {latePolicy === 'penalty' && (
          <div className="space-y-1.5">
            <Label>Penalty %</Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={latePenaltyPercent}
              onChange={(e) => setLatePenaltyPercent(Number(e.target.value) || 0)}
              className="w-32"
            />
          </div>
        )}

        <label className="flex items-start gap-3 rounded-lg border bg-muted/20 p-3 cursor-pointer">
          <input
            type="checkbox"
            checked={gradebookAutoPublish}
            onChange={(e) => setGradebookAutoPublish(e.target.checked)}
            className="mt-1 h-4 w-4"
          />
          <span className="text-sm space-y-0.5">
            <span className="font-medium block">Auto-publish marks to gradebook</span>
            <span className="text-xs text-muted-foreground block">
              When you finalise marking a submission, the mark goes straight to
              the gradebook. Off means you publish manually.
            </span>
          </span>
        </label>
      </CardContent>
    </Card>
  );
}
