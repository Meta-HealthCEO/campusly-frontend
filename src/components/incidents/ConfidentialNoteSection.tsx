'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Lock, Plus } from 'lucide-react';
import type { ConfidentialNote } from '@/types';

interface ConfidentialNoteSectionProps {
  notes: ConfidentialNote[];
  canCreate: boolean;
  onAdd: (content: string) => Promise<void>;
}

export function ConfidentialNoteSection({
  notes, canCreate, onAdd,
}: ConfidentialNoteSectionProps) {
  const [content, setContent] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    try {
      setSubmitting(true);
      await onAdd(content);
      setContent('');
      setShowForm(false);
    } catch (err: unknown) {
      console.error('Failed to add note', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Lock className="h-4 w-4" />
          Confidential Notes
        </div>
        {canCreate && !showForm && (
          <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Note
          </Button>
        )}
      </div>

      {showForm && (
        <div className="space-y-2 rounded-lg border border-dashed p-3">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Add confidential note..."
            rows={3}
          />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSubmit} disabled={submitting || !content.trim()}>
              {submitting ? 'Saving...' : 'Save Note'}
            </Button>
          </div>
        </div>
      )}

      {notes.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground text-center py-3">
          No confidential notes.
        </p>
      )}

      {notes.map((note) => (
        <div key={note.id} className="rounded-lg border p-3 space-y-1">
          <p className="text-sm whitespace-pre-wrap">{note.content}</p>
          <p className="text-xs text-muted-foreground">
            {note.createdBy?.firstName} {note.createdBy?.lastName} — {new Date(note.createdAt).toLocaleDateString()}
          </p>
        </div>
      ))}
    </div>
  );
}
