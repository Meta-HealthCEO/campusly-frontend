'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { Send } from 'lucide-react';
import type { CreateThreadPayload, Student } from '@/types';

interface RecipientOption {
  id: string;
  name: string;
  role: string;
}

interface NewThreadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: CreateThreadPayload) => void;
  userRole: string;
  /** For parent: their children. For teacher: students from their classes. */
  students: Student[];
  /** Loaded dynamically based on selected student. */
  recipients: RecipientOption[];
  onStudentSelect: (studentId: string) => void;
  loadingRecipients: boolean;
}

export function NewThreadDialog({
  open, onOpenChange, onSubmit, userRole, students,
  recipients, onStudentSelect, loadingRecipients,
}: NewThreadDialogProps) {
  const [studentId, setStudentId] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setStudentId('');
      setRecipientId('');
      setSubject('');
      setMessage('');
    }
  }, [open]);

  // Reset recipient when student changes
  useEffect(() => {
    setRecipientId('');
  }, [studentId]);

  const handleStudentChange = (val: string | null) => {
    const v = val ?? '';
    setStudentId(v);
    if (v) onStudentSelect(v);
  };

  const handleSend = () => {
    if (!studentId || !recipientId || !message.trim()) return;
    onSubmit({
      recipientId,
      studentId,
      subject: subject.trim() || undefined,
      message: message.trim(),
    });
  };

  const recipientLabel = userRole === 'teacher' ? 'Parent' : 'Teacher';
  const canSend = studentId && recipientId && message.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* Student selector */}
          <div className="space-y-2">
            <Label>Student <span className="text-destructive">*</span></Label>
            <Select onValueChange={handleStudentChange} value={studentId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a student" />
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.firstName} {s.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Recipient selector */}
          <div className="space-y-2">
            <Label>{recipientLabel} <span className="text-destructive">*</span></Label>
            <Select
              onValueChange={(val: string | null) => setRecipientId(val ?? '')}
              value={recipientId}
              disabled={!studentId || loadingRecipients}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    loadingRecipients
                      ? 'Loading...'
                      : !studentId
                        ? 'Select a student first'
                        : `Select a ${recipientLabel.toLowerCase()}`
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {recipients.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Subject (optional) */}
          <div className="space-y-2">
            <Label htmlFor="thread-subject">Subject</Label>
            <Input
              id="thread-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Optional subject"
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="thread-message">
              Message <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="thread-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              className="min-h-[100px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={!canSend}>
            <Send className="mr-2 h-4 w-4" />
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
