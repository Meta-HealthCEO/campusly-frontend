'use client';

import { useState } from 'react';
import {
  Plus, Clock, UserCheck, LogOut, DollarSign,
  CheckCircle2, XCircle, Users, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { formatCurrency } from '@/lib/utils';

// ============== Types & Mock Data ==============

interface AfterCareStudent {
  id: string;
  name: string;
  grade: string;
  mon: boolean; tue: boolean; wed: boolean; thu: boolean; fri: boolean;
  pickupPerson: string;
  pickupRelationship: string;
  pickupPhone: string;
  status: 'active' | 'inactive';
}

interface AfterCareAttendance {
  id: string;
  studentName: string;
  grade: string;
  checkInTime: string;
  checkOutTime: string | null;
  status: 'checked_in' | 'checked_out';
}

interface AfterCareBilling {
  id: string;
  studentName: string;
  month: string;
  daysAttended: number;
  ratePerDay: number;
  totalAmount: number;
  status: 'paid' | 'unpaid' | 'overdue';
}

interface SignOutEntry {
  id: string;
  studentName: string;
  pickedUpBy: string;
  relationship: string;
  time: string;
  isAuthorized: boolean;
  date: string;
}

const mockStudents: AfterCareStudent[] = [
  { id: 'ac1', name: 'Lerato Dlamini', grade: 'Grade 8', mon: true, tue: true, wed: true, thu: true, fri: false, pickupPerson: 'Sipho Dlamini', pickupRelationship: 'Father', pickupPhone: '082 123 4567', status: 'active' },
  { id: 'ac2', name: 'Themba Mbeki', grade: 'Grade 9', mon: true, tue: false, wed: true, thu: false, fri: true, pickupPerson: 'Zanele Mbeki', pickupRelationship: 'Mother', pickupPhone: '087 678 9012', status: 'active' },
  { id: 'ac3', name: 'Ayanda Khumalo', grade: 'Grade 8', mon: true, tue: true, wed: true, thu: true, fri: true, pickupPerson: 'Nkosazana Khumalo', pickupRelationship: 'Mother', pickupPhone: '083 456 7890', status: 'active' },
  { id: 'ac4', name: 'Bongani Nzimande', grade: 'Grade 10', mon: true, tue: true, wed: false, thu: true, fri: false, pickupPerson: 'Thandi Nzimande', pickupRelationship: 'Mother', pickupPhone: '084 567 8901', status: 'active' },
  { id: 'ac5', name: 'Nomsa Sithole', grade: 'Grade 9', mon: false, tue: true, wed: true, thu: true, fri: true, pickupPerson: 'Mandla Sithole', pickupRelationship: 'Father', pickupPhone: '085 678 9012', status: 'inactive' },
  { id: 'ac6', name: 'Kagiso Mokoena', grade: 'Grade 11', mon: true, tue: true, wed: true, thu: false, fri: false, pickupPerson: 'Palesa Mokoena', pickupRelationship: 'Mother', pickupPhone: '086 789 0123', status: 'active' },
];

const mockAttendance: AfterCareAttendance[] = [
  { id: 'att1', studentName: 'Lerato Dlamini', grade: 'Grade 8', checkInTime: '14:15', checkOutTime: '17:30', status: 'checked_out' },
  { id: 'att2', studentName: 'Ayanda Khumalo', grade: 'Grade 8', checkInTime: '14:05', checkOutTime: null, status: 'checked_in' },
  { id: 'att3', studentName: 'Bongani Nzimande', grade: 'Grade 10', checkInTime: '14:20', checkOutTime: null, status: 'checked_in' },
  { id: 'att4', studentName: 'Kagiso Mokoena', grade: 'Grade 11', checkInTime: '14:10', checkOutTime: '16:45', status: 'checked_out' },
];

const mockBilling: AfterCareBilling[] = [
  { id: 'b1', studentName: 'Lerato Dlamini', month: 'March 2026', daysAttended: 18, ratePerDay: 7500, totalAmount: 135000, status: 'paid' },
  { id: 'b2', studentName: 'Themba Mbeki', month: 'March 2026', daysAttended: 12, ratePerDay: 7500, totalAmount: 90000, status: 'unpaid' },
  { id: 'b3', studentName: 'Ayanda Khumalo', month: 'March 2026', daysAttended: 20, ratePerDay: 7500, totalAmount: 150000, status: 'paid' },
  { id: 'b4', studentName: 'Bongani Nzimande', month: 'March 2026', daysAttended: 14, ratePerDay: 7500, totalAmount: 105000, status: 'overdue' },
  { id: 'b5', studentName: 'Kagiso Mokoena', month: 'March 2026', daysAttended: 15, ratePerDay: 7500, totalAmount: 112500, status: 'unpaid' },
  { id: 'b6', studentName: 'Lerato Dlamini', month: 'February 2026', daysAttended: 16, ratePerDay: 7500, totalAmount: 120000, status: 'paid' },
];

const mockSignOutLog: SignOutEntry[] = [
  { id: 'so1', studentName: 'Lerato Dlamini', pickedUpBy: 'Sipho Dlamini', relationship: 'Father', time: '17:30', isAuthorized: true, date: '2026-03-28' },
  { id: 'so2', studentName: 'Kagiso Mokoena', pickedUpBy: 'Palesa Mokoena', relationship: 'Mother', time: '16:45', isAuthorized: true, date: '2026-03-28' },
  { id: 'so3', studentName: 'Ayanda Khumalo', pickedUpBy: 'John Smith', relationship: 'Uncle', time: '17:15', isAuthorized: false, date: '2026-03-27' },
  { id: 'so4', studentName: 'Bongani Nzimande', pickedUpBy: 'Thandi Nzimande', relationship: 'Mother', time: '17:00', isAuthorized: true, date: '2026-03-27' },
  { id: 'so5', studentName: 'Themba Mbeki', pickedUpBy: 'Zanele Mbeki', relationship: 'Mother', time: '16:30', isAuthorized: true, date: '2026-03-26' },
];

// ============== Column Definitions ==============

const DayCheck = ({ checked }: { checked: boolean }) => (
  <span className={checked ? 'text-emerald-600 font-bold' : 'text-muted-foreground'}>
    {checked ? '✓' : '–'}
  </span>
);

const studentColumns: ColumnDef<AfterCareStudent>[] = [
  { accessorKey: 'name', header: 'Student Name', cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
  { accessorKey: 'grade', header: 'Grade' },
  { id: 'mon', header: 'Mon', cell: ({ row }) => <DayCheck checked={row.original.mon} /> },
  { id: 'tue', header: 'Tue', cell: ({ row }) => <DayCheck checked={row.original.tue} /> },
  { id: 'wed', header: 'Wed', cell: ({ row }) => <DayCheck checked={row.original.wed} /> },
  { id: 'thu', header: 'Thu', cell: ({ row }) => <DayCheck checked={row.original.thu} /> },
  { id: 'fri', header: 'Fri', cell: ({ row }) => <DayCheck checked={row.original.fri} /> },
  { accessorKey: 'pickupPerson', header: 'Pickup Person' },
  {
    id: 'status', header: 'Status', accessorKey: 'status',
    cell: ({ row }) => (
      <Badge variant="secondary" className={row.original.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'}>
        {row.original.status}
      </Badge>
    ),
  },
];

const attendanceColumns: ColumnDef<AfterCareAttendance>[] = [
  { accessorKey: 'studentName', header: 'Student', cell: ({ row }) => <span className="font-medium">{row.original.studentName}</span> },
  { accessorKey: 'grade', header: 'Grade' },
  { accessorKey: 'checkInTime', header: 'Check In' },
  { id: 'checkOut', header: 'Check Out', cell: ({ row }) => row.original.checkOutTime ?? <span className="text-muted-foreground italic">Still here</span> },
  {
    id: 'status', header: 'Status', accessorKey: 'status',
    cell: ({ row }) => (
      <Badge variant="secondary" className={row.original.status === 'checked_in' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'}>
        {row.original.status === 'checked_in' ? 'Checked In' : 'Checked Out'}
      </Badge>
    ),
  },
  {
    id: 'actions', header: '',
    cell: ({ row }) => {
      if (row.original.status === 'checked_in') {
        return (
          <Button size="xs" variant="outline" onClick={() => toast.success(`${row.original.studentName} checked out`)}>
            <LogOut className="mr-1 h-3 w-3" /> Check Out
          </Button>
        );
      }
      return null;
    },
  },
];

const billingStatusStyles: Record<string, string> = {
  paid: 'bg-emerald-100 text-emerald-800',
  unpaid: 'bg-amber-100 text-amber-800',
  overdue: 'bg-red-100 text-red-800',
};

const billingColumns: ColumnDef<AfterCareBilling>[] = [
  { accessorKey: 'studentName', header: 'Student', cell: ({ row }) => <span className="font-medium">{row.original.studentName}</span> },
  { accessorKey: 'month', header: 'Month' },
  { accessorKey: 'daysAttended', header: 'Days' },
  { id: 'rate', header: 'Rate/Day', cell: ({ row }) => formatCurrency(row.original.ratePerDay) },
  { id: 'total', header: 'Total', cell: ({ row }) => <span className="font-medium">{formatCurrency(row.original.totalAmount)}</span> },
  {
    id: 'status', header: 'Status', accessorKey: 'status',
    cell: ({ row }) => (
      <Badge variant="secondary" className={billingStatusStyles[row.original.status] ?? ''}>
        {row.original.status}
      </Badge>
    ),
  },
  {
    id: 'actions', header: '',
    cell: ({ row }) => {
      if (row.original.status !== 'paid') {
        return (
          <Button size="xs" variant="outline" onClick={() => toast.success(`Invoice sent for ${row.original.studentName}`)}>
            Send Invoice
          </Button>
        );
      }
      return null;
    },
  },
];

const signOutColumns: ColumnDef<SignOutEntry>[] = [
  { accessorKey: 'studentName', header: 'Student', cell: ({ row }) => <span className="font-medium">{row.original.studentName}</span> },
  { accessorKey: 'pickedUpBy', header: 'Picked Up By' },
  { accessorKey: 'relationship', header: 'Relationship' },
  { accessorKey: 'time', header: 'Time' },
  { accessorKey: 'date', header: 'Date' },
  {
    id: 'authorized', header: 'Authorized',
    cell: ({ row }) => row.original.isAuthorized ? (
      <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
        <CheckCircle2 className="mr-1 h-3 w-3" /> Yes
      </Badge>
    ) : (
      <Badge variant="secondary" className="bg-red-100 text-red-800">
        <AlertTriangle className="mr-1 h-3 w-3" /> Unauthorized
      </Badge>
    ),
  },
];

// ============== Page Component ==============

export default function AfterCarePage() {
  const [dialogOpen, setDialogOpen] = useState(false);

  const totalEnrolled = mockStudents.filter(s => s.status === 'active').length;
  const presentToday = mockAttendance.length;
  const checkedOut = mockAttendance.filter(a => a.status === 'checked_out').length;
  const pendingPickup = mockAttendance.filter(a => a.status === 'checked_in').length;

  return (
    <div className="space-y-6">
      <PageHeader title="After Care" description="Manage after-school care registrations, attendance, and billing.">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="mr-2 h-4 w-4" />
            Register Student
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Register Student for After Care</DialogTitle>
              <DialogDescription>Select a student and configure their after-care schedule.</DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                toast.success('Student registered for After Care');
                setDialogOpen(false);
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>Student</Label>
                <Select>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select student" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="st1">Lerato Dlamini</SelectItem>
                    <SelectItem value="st2">Themba Mbeki</SelectItem>
                    <SelectItem value="st3">Ayanda Khumalo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Days Enrolled</Label>
                <div className="flex gap-4">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(day => (
                    <label key={day} className="flex items-center gap-1.5 text-sm">
                      <Checkbox defaultChecked={day !== 'Fri'} />
                      {day}
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pickupName">Authorized Pickup Person</Label>
                <Input id="pickupName" placeholder="Full name" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="pickupId">ID Number</Label>
                  <Input id="pickupId" placeholder="SA ID number" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pickupRel">Relationship</Label>
                  <Select>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mother">Mother</SelectItem>
                      <SelectItem value="father">Father</SelectItem>
                      <SelectItem value="guardian">Guardian</SelectItem>
                      <SelectItem value="grandparent">Grandparent</SelectItem>
                      <SelectItem value="sibling">Sibling</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pickupPhone">Phone Number</Label>
                <Input id="pickupPhone" placeholder="e.g. 082 123 4567" />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit">Register</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Enrolled" value={String(totalEnrolled)} icon={Users} description="Active students" />
        <StatCard title="Present Today" value={String(presentToday)} icon={UserCheck} description="Checked in today" />
        <StatCard title="Checked Out" value={String(checkedOut)} icon={CheckCircle2} description="Already collected" />
        <StatCard title="Pending Pickup" value={String(pendingPickup)} icon={Clock} description="Still at school" />
      </div>

      <Tabs defaultValue="enrolled">
        <TabsList>
          <TabsTrigger value="enrolled">Enrolled Students</TabsTrigger>
          <TabsTrigger value="attendance">Today&apos;s Attendance</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="signout">Sign-Out Log</TabsTrigger>
        </TabsList>

        <TabsContent value="enrolled">
          <DataTable columns={studentColumns} data={mockStudents} searchKey="name" searchPlaceholder="Search students..." />
        </TabsContent>

        <TabsContent value="attendance">
          <DataTable columns={attendanceColumns} data={mockAttendance} searchKey="studentName" searchPlaceholder="Search attendance..." />
        </TabsContent>

        <TabsContent value="billing">
          <DataTable columns={billingColumns} data={mockBilling} searchKey="studentName" searchPlaceholder="Search billing..." />
        </TabsContent>

        <TabsContent value="signout">
          <DataTable columns={signOutColumns} data={mockSignOutLog} searchKey="studentName" searchPlaceholder="Search sign-out log..." />
        </TabsContent>
      </Tabs>
    </div>
  );
}
