'use client';

import { useEffect, useState } from 'react';
import { Pencil, Save, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MarkdownView } from '@/components/shared/MarkdownView';
import { useTeacherAssignments } from '@/hooks/useTeacherAssignments';
import type { Assignment } from '@/types/assignments';

interface Props {
  assignment: Assignment;
  onChanged: () => Promise<void>;
}

export function AssignmentBriefTab({ assignment, onChanged }: Props) {
  const { update } = useTeacherAssignments();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(assignment.title);
  const [brief, setBrief] = useState(assignment.brief);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) {
      setTitle(assignment.title);
      setBrief(assignment.brief);
    }
  }, [editing, assignment.title, assignment.brief]);

  const handleSave = async () => {
    setSaving(true);
    const ok = await update(assignment._id, { title: title.trim(), brief: brief.trim() });
    setSaving(false);
    if (ok) {
      setEditing(false);
      await onChanged();
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Assignment brief</CardTitle>
          {!editing ? (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditing(false)}
                disabled={saving}
              >
                <X className="mr-1 h-3.5 w-3.5" /> Cancel
              </Button>
              <Button size="sm" onClick={() => void handleSave()} disabled={saving}>
                <Save className="mr-1 h-3.5 w-3.5" /> {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Brief (markdown supported)</Label>
              <Textarea
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                rows={20}
                className="font-mono text-sm"
              />
            </div>
          </div>
        ) : (
          <MarkdownView>{assignment.brief}</MarkdownView>
        )}
      </CardContent>
    </Card>
  );
}
