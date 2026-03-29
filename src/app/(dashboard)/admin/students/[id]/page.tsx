'use client';

import { use } from 'react';
import { ArrowLeft, User, GraduationCap, CreditCard, CalendarCheck } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { EmptyState } from '@/components/shared/EmptyState';
import { mockStudents, mockInvoices, mockAttendance, mockStudentGrades } from '@/lib/mock-data';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function StudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const student = mockStudents.find((s) => s.id === id);

  if (!student) {
    return (
      <div className="space-y-6">
        <Link href="/admin/students">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Students
          </Button>
        </Link>
        <EmptyState title="Student not found" description="The student you are looking for does not exist." />
      </div>
    );
  }

  const studentInvoices = mockInvoices.filter((inv) => inv.studentId === student.id);
  const studentAttendance = mockAttendance.filter((att) => att.studentId === student.id);
  const studentGrades = mockStudentGrades.filter((sg) => sg.studentId === student.id);

  const statusColor = student.isActive
    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/students">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {student.user.firstName} {student.user.lastName}
          </h1>
          <p className="text-muted-foreground">{student.admissionNumber}</p>
        </div>
        <Badge className={statusColor}>{student.isActive ? 'Active' : 'Inactive'}</Badge>
      </div>

      <Tabs defaultValue="personal">
        <TabsList>
          <TabsTrigger value="personal">
            <User className="mr-1 h-4 w-4" />
            Personal
          </TabsTrigger>
          <TabsTrigger value="academic">
            <GraduationCap className="mr-1 h-4 w-4" />
            Academic
          </TabsTrigger>
          <TabsTrigger value="financial">
            <CreditCard className="mr-1 h-4 w-4" />
            Financial
          </TabsTrigger>
          <TabsTrigger value="attendance">
            <CalendarCheck className="mr-1 h-4 w-4" />
            Attendance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow label="Full Name" value={`${student.user.firstName} ${student.user.lastName}`} />
                <InfoRow label="Date of Birth" value={formatDate(student.dateOfBirth)} />
                <InfoRow label="Gender" value={student.gender.charAt(0).toUpperCase() + student.gender.slice(1)} />
                <InfoRow label="Address" value={student.address} />
                <InfoRow label="Grade" value={student.grade.name} />
                <InfoRow label="Class" value={student.class.name} />
                <InfoRow label="Enrolled" value={formatDate(student.enrolledDate)} />
                {student.house && <InfoRow label="House" value={student.house.name} />}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Medical Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow label="Blood Type" value={student.medicalInfo.bloodType || 'Not recorded'} />
                <InfoRow
                  label="Allergies"
                  value={student.medicalInfo.allergies.length > 0 ? student.medicalInfo.allergies.join(', ') : 'None'}
                />
                <InfoRow
                  label="Conditions"
                  value={student.medicalInfo.conditions.length > 0 ? student.medicalInfo.conditions.join(', ') : 'None'}
                />
                <InfoRow
                  label="Medications"
                  value={student.medicalInfo.medications.length > 0 ? student.medicalInfo.medications.join(', ') : 'None'}
                />
                <Separator />
                <InfoRow label="Emergency Contact" value={student.medicalInfo.emergencyContact} />
                <InfoRow label="Emergency Phone" value={student.medicalInfo.emergencyPhone} />
                {student.medicalInfo.doctorName && <InfoRow label="Doctor" value={student.medicalInfo.doctorName} />}
                {student.medicalInfo.doctorPhone && <InfoRow label="Doctor Phone" value={student.medicalInfo.doctorPhone} />}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="academic" className="mt-4 space-y-4">
          {studentGrades.length === 0 ? (
            <EmptyState icon={GraduationCap} title="No grades yet" description="Academic results will appear here once assessments are graded." />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Assessment Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {studentGrades.map((sg) => (
                    <div key={sg.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium">{sg.assessment.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {sg.assessment.subject.name} - {sg.assessment.type.charAt(0).toUpperCase() + sg.assessment.type.slice(1)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{sg.marks}/{sg.assessment.totalMarks}</p>
                        <p className="text-sm text-muted-foreground">{sg.percentage}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="financial" className="mt-4 space-y-4">
          {studentInvoices.length === 0 ? (
            <EmptyState icon={CreditCard} title="No invoices" description="Financial records will appear here." />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Invoices</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {studentInvoices.map((inv) => {
                    const statusStyles: Record<string, string> = {
                      paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
                      partial: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
                      overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                      sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                      draft: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
                      cancelled: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
                    };
                    return (
                      <div key={inv.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <p className="font-medium">{inv.invoiceNumber}</p>
                          <p className="text-sm text-muted-foreground">Due: {formatDate(inv.dueDate)}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="font-semibold">{formatCurrency(inv.totalAmount)}</p>
                            {inv.balanceDue > 0 && (
                              <p className="text-sm text-muted-foreground">Balance: {formatCurrency(inv.balanceDue)}</p>
                            )}
                          </div>
                          <Badge className={statusStyles[inv.status] || ''}>
                            {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="attendance" className="mt-4 space-y-4">
          {studentAttendance.length === 0 ? (
            <EmptyState icon={CalendarCheck} title="No attendance records" description="Attendance data will appear here." />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Attendance Records</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {studentAttendance.slice(0, 20).map((att) => {
                    const statusStyles: Record<string, string> = {
                      present: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
                      absent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                      late: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
                      excused: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                    };
                    return (
                      <div key={att.id} className="flex items-center justify-between rounded-lg border p-2 px-3">
                        <span className="text-sm">{formatDate(att.date)}</span>
                        <Badge className={statusStyles[att.status] || ''}>
                          {att.status.charAt(0).toUpperCase() + att.status.slice(1)}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
