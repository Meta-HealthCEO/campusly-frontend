'use client';

import { useState } from 'react';
import { Calendar, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface AddToCalendarButtonProps {
  eventId: string;
  eventTitle: string;
  onDownload: (eventId: string, eventTitle: string) => Promise<void>;
}

export function AddToCalendarButton({
  eventId,
  eventTitle,
  onDownload,
}: AddToCalendarButtonProps) {
  const [downloading, setDownloading] = useState(false);

  const handleClick = async () => {
    setDownloading(true);
    try {
      await onDownload(eventId, eventTitle);
      toast.success('Calendar file downloaded');
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to download calendar file',
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      className="gap-1"
      onClick={handleClick}
      disabled={downloading}
    >
      {downloading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Calendar className="h-3.5 w-3.5" />
      )}
      Add to Calendar
    </Button>
  );
}
