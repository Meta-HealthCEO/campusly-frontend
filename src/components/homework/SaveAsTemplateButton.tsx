'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bookmark } from 'lucide-react';

interface SaveAsTemplateButtonProps {
  onSave: () => Promise<boolean>;
}

export function SaveAsTemplateButton({ onSave }: SaveAsTemplateButtonProps) {
  const [saving, setSaving] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSaving(true);
    try {
      await onSave();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={handleClick}
      disabled={saving}
      aria-label="Save as template"
      title="Save as template"
    >
      <Bookmark className="h-4 w-4 text-muted-foreground" />
    </Button>
  );
}
