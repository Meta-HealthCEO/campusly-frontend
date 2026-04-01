'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface TranscriptDownloadProps {
  onDownload: () => Promise<void>;
}

export default function TranscriptDownload({ onDownload }: TranscriptDownloadProps) {
  const [downloading, setDownloading] = useState(false);

  const handleClick = async () => {
    setDownloading(true);
    try {
      await onDownload();
      toast.success('Transcript downloaded');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate transcript';
      toast.error(msg);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Button onClick={handleClick} disabled={downloading}>
      {downloading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          Download Transcript
        </>
      )}
    </Button>
  );
}
