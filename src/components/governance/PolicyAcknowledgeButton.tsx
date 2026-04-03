'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2 } from 'lucide-react';

interface PolicyAcknowledgeButtonProps {
  acknowledged: boolean;
  onAcknowledge: () => Promise<void>;
}

export function PolicyAcknowledgeButton({
  acknowledged,
  onAcknowledge,
}: PolicyAcknowledgeButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (acknowledged || loading) return;
    setLoading(true);
    try {
      await onAcknowledge();
    } finally {
      setLoading(false);
    }
  };

  if (acknowledged) {
    return (
      <Button variant="outline" disabled className="gap-2">
        <CheckCircle className="h-4 w-4 text-green-600" />
        Acknowledged
      </Button>
    );
  }

  return (
    <Button onClick={handleClick} disabled={loading} className="gap-2">
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Acknowledging...
        </>
      ) : (
        <>
          <CheckCircle className="h-4 w-4" />
          Acknowledge
        </>
      )}
    </Button>
  );
}
