'use client';

import { Loader2, Database } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface ImportProgressProps {
  fileName: string;
}

export function ImportProgress({ fileName }: ImportProgressProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="relative">
        <Database className="h-12 w-12 text-primary" />
        <Loader2 className="absolute -bottom-1 -right-1 h-5 w-5 animate-spin text-primary" />
      </div>
      <div className="text-center">
        <p className="font-medium">Importing Data...</p>
        <p className="text-sm text-muted-foreground">
          Processing {fileName}. This may take a few minutes.
        </p>
      </div>
      <div className="w-full max-w-xs">
        <Progress value={null} />
      </div>
      <p className="text-xs text-muted-foreground">
        Please do not close this page while the import is in progress.
      </p>
    </div>
  );
}
