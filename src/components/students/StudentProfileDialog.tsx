'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useStudentEditor } from '@/hooks/useStudentEditor';
import type { StudentProfileFormData } from '@/hooks/useStudentEditor';
import { PersonalEditTab } from './profile-tabs/PersonalEditTab';
import { ContactEditTab } from './profile-tabs/ContactEditTab';
import { MedicalEditTab } from './profile-tabs/MedicalEditTab';
import { EnrolmentEditTab } from './profile-tabs/EnrolmentEditTab';

interface StudentProfileDialogProps {
  studentId: string | null;
  onClose: () => void;
}

function toDateInputValue(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function buildInitialForm(student: import('@/types').Student): Partial<StudentProfileFormData> {
  const u = student.user ?? { firstName: '', lastName: '', email: '', phone: undefined };
  const mp = student.medicalProfile;
  return {
    firstName: u.firstName ?? '',
    lastName: u.lastName ?? '',
    email: u.email ?? '',
    phone: u.phone ?? '',
    admissionNumber: student.admissionNumber ?? '',
    dateOfBirth: toDateInputValue(student.dateOfBirth),
    gender: student.gender,
    saIdNumber: student.saIdNumber ?? '',
    luritsNumber: student.luritsNumber ?? '',
    previousSchool: student.previousSchool ?? '',
    homeLanguage: student.homeLanguage ?? '',
    additionalLanguages: student.additionalLanguages ?? [],
    transportRequired: student.transportRequired ?? false,
    afterCareRequired: student.afterCareRequired ?? false,
    enrollmentStatus: student.enrollmentStatus ?? 'active',
    medicalProfile: mp
      ? {
          allergies: mp.allergies ?? [],
          conditions: mp.conditions ?? [],
          bloodType: mp.bloodType ?? '',
          emergencyContacts: mp.emergencyContacts ?? [],
          medicalAidInfo: mp.medicalAidInfo,
        }
      : { allergies: [], conditions: [], bloodType: '', emergencyContacts: [] },
  };
}

export function StudentProfileDialog({ studentId, onClose }: StudentProfileDialogProps) {
  const { student, loading, updateStudent } = useStudentEditor(studentId);
  const [form, setForm] = useState<Partial<StudentProfileFormData>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (student) {
      setForm(buildInitialForm(student));
    }
  }, [student]);

  function handleChange(patch: Partial<StudentProfileFormData>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateStudent(form);
      toast.success('Student profile updated');
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to save student profile';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={studentId !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {student
              ? `Edit Profile — ${student.user?.firstName ?? ''} ${student.user?.lastName ?? ''}`.trim()
              : 'Edit Student Profile'}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-1 items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : student ? (
          <div className="flex-1 overflow-y-auto">
            <Tabs defaultValue="personal">
              <TabsList className="flex-wrap mb-4">
                <TabsTrigger value="personal">Personal</TabsTrigger>
                <TabsTrigger value="contact">Contact</TabsTrigger>
                <TabsTrigger value="medical">Medical</TabsTrigger>
                <TabsTrigger value="enrolment">Enrolment</TabsTrigger>
              </TabsList>
              <TabsContent value="personal">
                <PersonalEditTab form={form} onChange={handleChange} />
              </TabsContent>
              <TabsContent value="contact">
                <ContactEditTab form={form} onChange={handleChange} />
              </TabsContent>
              <TabsContent value="medical">
                <MedicalEditTab form={form} onChange={handleChange} />
              </TabsContent>
              <TabsContent value="enrolment">
                <EnrolmentEditTab form={form} student={student} onChange={handleChange} />
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Student not found.
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading || !student}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
