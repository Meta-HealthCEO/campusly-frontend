'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users, UserCheck, CheckCircle2, Clock,
  CalendarDays, ShieldCheck, DollarSign,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAftercare } from '@/hooks/useAftercare';
import { EnrolledTab } from '@/components/aftercare/EnrolledTab';
import { AttendanceTab } from '@/components/aftercare/AttendanceTab';
import { PickupAuthTab } from '@/components/aftercare/PickupAuthTab';
import { SignOutTab } from '@/components/aftercare/SignOutTab';
import { ActivitiesTab } from '@/components/aftercare/ActivitiesTab';
import { BillingTab } from '@/components/aftercare/BillingTab';
import apiClient from '@/lib/api-client';

interface StaffOption {
  id: string;
  name: string;
}

export default function AfterCarePage() {
  const {
    registrations, attendance, pickupAuths, signOutLogs, activities, invoices,
    students, loading,
    createRegistration, updateRegistration, deleteRegistration,
    checkIn, checkOut,
    createPickupAuth, updatePickupAuth, deletePickupAuth,
    createSignOutLog,
    createActivity, updateActivity, deleteActivity,
    fetchInvoices, generateInvoices, markInvoicePaid,
  } = useAftercare();

  const [staff, setStaff] = useState<StaffOption[]>([]);

  const fetchStaff = useCallback(async () => {
    try {
      const res = await apiClient.get('/staff');
      const raw = res.data.data ?? res.data;
      const arr = Array.isArray(raw) ? raw : raw.staff ?? raw.data ?? [];
      setStaff(
        arr.map((s: Record<string, unknown>) => ({
          id: (s._id as string) ?? (s.id as string),
          name: `${(s.firstName as string) ?? ''} ${(s.lastName as string) ?? ''}`.trim()
            || ((s.email as string) ?? ''),
        })),
      );
    } catch {
      console.error('Failed to load staff');
    }
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  if (loading) {
    return <LoadingSpinner size="lg" />;
  }

  const activeRegistrations = registrations.filter((r) => r.isActive);
  const totalEnrolled = activeRegistrations.length;
  const presentToday = attendance.length;
  const checkedOut = attendance.filter((a) => !!a.checkOutTime).length;
  const pendingPickup = attendance.filter((a) => !a.checkOutTime).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="After Care"
        description="Manage after-school care registrations, attendance, and billing."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Enrolled" value={String(totalEnrolled)} icon={Users} description="Active students" />
        <StatCard title="Present Today" value={String(presentToday)} icon={UserCheck} description="Checked in today" />
        <StatCard title="Checked Out" value={String(checkedOut)} icon={CheckCircle2} description="Already collected" />
        <StatCard title="Pending Pickup" value={String(pendingPickup)} icon={Clock} description="Still at school" />
      </div>

      <Tabs defaultValue="enrolled">
        <TabsList>
          <TabsTrigger value="enrolled">
            <Users className="h-4 w-4 mr-1.5" /> Enrolled
          </TabsTrigger>
          <TabsTrigger value="attendance">
            <UserCheck className="h-4 w-4 mr-1.5" /> Attendance
          </TabsTrigger>
          <TabsTrigger value="pickup">
            <ShieldCheck className="h-4 w-4 mr-1.5" /> Pickup Auth
          </TabsTrigger>
          <TabsTrigger value="signout">
            <Clock className="h-4 w-4 mr-1.5" /> Sign-Out Log
          </TabsTrigger>
          <TabsTrigger value="activities">
            <CalendarDays className="h-4 w-4 mr-1.5" /> Activities
          </TabsTrigger>
          <TabsTrigger value="billing">
            <DollarSign className="h-4 w-4 mr-1.5" /> Billing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="enrolled">
          <EnrolledTab
            registrations={registrations}
            students={students}
            onRegister={createRegistration}
            onUpdate={updateRegistration}
            onDelete={deleteRegistration}
            onCreatePickupAuth={createPickupAuth}
          />
        </TabsContent>

        <TabsContent value="attendance">
          <AttendanceTab
            attendance={attendance}
            students={students}
            onCheckIn={checkIn}
            onCheckOut={checkOut}
          />
        </TabsContent>

        <TabsContent value="pickup">
          <PickupAuthTab
            pickupAuths={pickupAuths}
            students={students}
            onCreate={createPickupAuth}
            onUpdate={updatePickupAuth}
            onDelete={deletePickupAuth}
          />
        </TabsContent>

        <TabsContent value="signout">
          <SignOutTab
            signOutLogs={signOutLogs}
            attendance={attendance}
            pickupAuths={pickupAuths}
            students={students}
            onCreateSignOut={createSignOutLog}
          />
        </TabsContent>

        <TabsContent value="activities">
          <ActivitiesTab
            activities={activities}
            students={students}
            staff={staff}
            onCreate={createActivity}
            onUpdate={updateActivity}
            onDelete={deleteActivity}
          />
        </TabsContent>

        <TabsContent value="billing">
          <BillingTab
            invoices={invoices}
            onGenerateInvoices={generateInvoices}
            onMarkPaid={markInvoicePaid}
            onFetchInvoices={fetchInvoices}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
