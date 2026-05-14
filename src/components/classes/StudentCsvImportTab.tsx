'use client';

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface CsvProgress {
  current: number;
  total: number;
  errors: string[];
}

interface StudentCsvImportTabProps {
  csvText: string;
  onCsvTextChange: (value: string) => void;
  csvErrors: string[];
  progress: CsvProgress;
}

export function StudentCsvImportTab({
  csvText,
  onCsvTextChange,
  csvErrors,
  progress,
}: StudentCsvImportTabProps) {
  return (
    <>
      <div className="space-y-2">
        <Label>
          Paste CSV (one learner per line: firstName,lastName,optionalAdmissionNumber)
        </Label>
        <Textarea
          rows={6}
          placeholder={`John,Doe\nJane,Smith,ADM002`}
          value={csvText}
          onChange={(e) => onCsvTextChange(e.target.value)}
        />
        {csvErrors.length > 0 && (
          <ul className="mt-2 space-y-1 text-xs text-destructive">
            {csvErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        )}
      </div>
      {progress.total > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Adding students...</span>
            <span>{progress.current}/{progress.total}</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
          {progress.errors.length > 0 && (
            <p className="text-xs text-destructive">{progress.errors.length} failed</p>
          )}
        </div>
      )}
    </>
  );
}
