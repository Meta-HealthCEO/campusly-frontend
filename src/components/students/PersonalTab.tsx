'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import type { Student } from '@/types';

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function getUser(student: Student): { firstName: string; lastName: string; email?: string; phone?: string } {
  return student.user ?? { firstName: student.firstName ?? '', lastName: student.lastName ?? '' };
}

function getGradeName(student: Student): string {
  return student.grade?.name ?? '-';
}

function getClassName(student: Student): string {
  return student.class?.name ?? '-';
}

interface PersonalTabProps {
  student: Student;
}

export function PersonalTab({ student }: PersonalTabProps) {
  const u = getUser(student);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <InfoRow label="Full Name" value={`${u?.firstName ?? student.firstName ?? ''} ${u?.lastName ?? student.lastName ?? ''}`} />
        {student.dateOfBirth && <InfoRow label="Date of Birth" value={formatDate(student.dateOfBirth)} />}
        {student.gender && <InfoRow label="Gender" value={student.gender.charAt(0).toUpperCase() + student.gender.slice(1)} />}
        <InfoRow label="Grade" value={getGradeName(student)} />
        <InfoRow label="Class" value={getClassName(student)} />
        <InfoRow label="Admission No" value={student.admissionNumber} />
        {student.enrollmentDate && <InfoRow label="Enrolled" value={formatDate(student.enrollmentDate)} />}
        <InfoRow label="Status" value={student.enrollmentStatus?.charAt(0).toUpperCase() + student.enrollmentStatus?.slice(1)} />
        {student.homeLanguage && <InfoRow label="Home Language" value={student.homeLanguage} />}
        {student.previousSchool && <InfoRow label="Previous School" value={student.previousSchool} />}
        {u?.email && <InfoRow label="Email" value={u.email} />}
        {u?.phone && <InfoRow label="Phone" value={u.phone} />}
      </CardContent>
    </Card>
  );
}
