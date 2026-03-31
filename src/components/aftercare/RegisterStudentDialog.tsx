'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import type { StudentOption } from '@/hooks/useAftercare';

const WEEKDAY_OPTIONS = [
  { value: 'monday', label: 'Mon' },
  { value: 'tuesday', label: 'Tue' },
  { value: 'wednesday', label: 'Wed' },
  { value: 'thursday', label: 'Thu' },
  { value: 'friday', label: 'Fri' },
];

interface RegisterStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: StudentOption[];
  onRegister: (data: {
    studentId: string;
    term: number;
    academicYear: number;
    daysPerWeek: string[];
    monthlyFee: number;
  }) => Promise<void>;
  onCreatePickupAuth: (data: {
    studentId: string;
    authorizedPersonName: string;
    idNumber: string;
    relationship: string;
    phoneNumber: string;
  }) => Promise<void>;
}

export function RegisterStudentDialog({
  open, onOpenChange, students, onRegister, onCreatePickupAuth,
}: RegisterStudentDialogProps) {
  const [studentId, setStudentId] = useState('');
  const [term, setTerm] = useState('1');
  const [academicYear, setAcademicYear] = useState(String(new Date().getFullYear()));
  const [days, setDays] = useState<string[]>(['monday', 'tuesday', 'wednesday', 'thursday']);
  const [monthlyFee, setMonthlyFee] = useState('');
  const [pickupName, setPickupName] = useState('');
  const [pickupId, setPickupId] = useState('');
  const [pickupRelationship, setPickupRelationship] = useState('');
  const [pickupPhone, setPickupPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const toggleDay = (day: string) => {
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const resetForm = () => {
    setStudentId('');
    setTerm('1');
    setAcademicYear(String(new Date().getFullYear()));
    setDays(['monday', 'tuesday', 'wednesday', 'thursday']);
    setMonthlyFee('');
    setPickupName('');
    setPickupId('');
    setPickupRelationship('');
    setPickupPhone('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId) { toast.error('Please select a student'); return; }
    if (days.length === 0) { toast.error('Select at least one day'); return; }
    if (!monthlyFee || Number(monthlyFee) < 0) { toast.error('Enter a valid monthly fee'); return; }

    setSubmitting(true);
    try {
      const feeCents = Math.round(Number(monthlyFee) * 100);
      await onRegister({
        studentId,
        term: Number(term),
        academicYear: Number(academicYear),
        daysPerWeek: days,
        monthlyFee: feeCents,
      });

      if (pickupName && pickupId && pickupRelationship && pickupPhone) {
        await onCreatePickupAuth({
          studentId,
          authorizedPersonName: pickupName,
          idNumber: pickupId,
          relationship: pickupRelationship,
          phoneNumber: pickupPhone,
        });
      }

      resetForm();
      onOpenChange(false);
    } catch {
      toast.error('Failed to register student');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Register Student for After Care</DialogTitle>
          <DialogDescription>
            Select a student and configure their after-care schedule.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Student</Label>
            <Select value={studentId} onValueChange={(v: unknown) => setStudentId(v as string)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select student" />
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} {s.grade ? `(${s.grade})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Term</Label>
              <Select value={term} onValueChange={(v: unknown) => setTerm(v as string)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4].map((t) => (
                    <SelectItem key={t} value={String(t)}>Term {t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Academic Year</Label>
              <Input
                type="number"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                min={2020}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Days Enrolled</Label>
            <div className="flex gap-4">
              {WEEKDAY_OPTIONS.map((d) => (
                <label key={d.value} className="flex items-center gap-1.5 text-sm">
                  <Checkbox
                    checked={days.includes(d.value)}
                    onCheckedChange={() => toggleDay(d.value)}
                  />
                  {d.label}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Monthly Fee (Rands)</Label>
            <Input
              type="number"
              placeholder="e.g. 750"
              value={monthlyFee}
              onChange={(e) => setMonthlyFee(e.target.value)}
              min={0}
              step="0.01"
            />
          </div>

          <div className="border-t pt-4 space-y-2">
            <p className="text-sm font-medium">Authorized Pickup Person (optional)</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pickupName">Full Name</Label>
            <Input id="pickupName" value={pickupName} onChange={(e) => setPickupName(e.target.value)} placeholder="Full name" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pickupIdNum">ID Number</Label>
              <Input id="pickupIdNum" value={pickupId} onChange={(e) => setPickupId(e.target.value)} placeholder="SA ID number" />
            </div>
            <div className="space-y-2">
              <Label>Relationship</Label>
              <Select value={pickupRelationship} onValueChange={(v: unknown) => setPickupRelationship(v as string)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {['Mother', 'Father', 'Guardian', 'Grandparent', 'Sibling', 'Other'].map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pickupPhoneNum">Phone Number</Label>
            <Input id="pickupPhoneNum" value={pickupPhone} onChange={(e) => setPickupPhone(e.target.value)} placeholder="e.g. 082 123 4567" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Registering...' : 'Register'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
