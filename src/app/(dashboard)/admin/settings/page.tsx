'use client';

import { useState } from 'react';
import { Settings, LayoutGrid, Users } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { mockSchool, mockUsers } from '@/lib/mock-data';
import type { User } from '@/types';

const modules = [
  { id: 'fees', name: 'Fee Management', description: 'Manage school fees, invoices, and payments' },
  { id: 'wallet', name: 'Digital Wallet', description: 'Student wallets and wristband payments' },
  { id: 'tuckshop', name: 'Tuckshop', description: 'Tuckshop menu and sales management' },
  { id: 'transport', name: 'Transport', description: 'School transport routes and tracking' },
  { id: 'communication', name: 'Communication', description: 'Messaging and announcements' },
  { id: 'events', name: 'Events', description: 'School events and calendar' },
  { id: 'library', name: 'Library', description: 'Library book management and borrowing' },
  { id: 'discipline', name: 'Discipline', description: 'Merit and demerit tracking' },
];

const userColumns: ColumnDef<User>[] = [
  {
    id: 'name',
    header: 'Name',
    accessorFn: (row) => `${row.firstName} ${row.lastName}`,
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    id: 'role',
    header: 'Role',
    cell: ({ row }) => {
      const roleStyles: Record<string, string> = {
        admin: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        teacher: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        parent: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
        student: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        tuckshop: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
      };
      return (
        <Badge className={roleStyles[row.original.role] || ''}>
          {row.original.role.charAt(0).toUpperCase() + row.original.role.slice(1)}
        </Badge>
      );
    },
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <Badge
        className={
          row.original.isActive
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        }
      >
        {row.original.isActive ? 'Active' : 'Inactive'}
      </Badge>
    ),
  },
];

export default function SettingsPage() {
  const [enabledModules, setEnabledModules] = useState<string[]>(mockSchool.enabledModules);

  const toggleModule = (moduleId: string) => {
    setEnabledModules((prev) =>
      prev.includes(moduleId) ? prev.filter((id) => id !== moduleId) : [...prev, moduleId]
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage school configuration and preferences" />

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">
            <Settings className="mr-1 h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="modules">
            <LayoutGrid className="mr-1 h-4 w-4" />
            Modules
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="mr-1 h-4 w-4" />
            Users
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>School Information</CardTitle>
              <CardDescription>Basic details about your school</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow label="School Name" value={mockSchool.name} />
              <InfoRow label="Address" value={`${mockSchool.address}, ${mockSchool.city}, ${mockSchool.province} ${mockSchool.postalCode}`} />
              <InfoRow label="Phone" value={mockSchool.phone} />
              <InfoRow label="Email" value={mockSchool.email} />
              {mockSchool.website && <InfoRow label="Website" value={mockSchool.website} />}
              <InfoRow label="Type" value={mockSchool.type.charAt(0).toUpperCase() + mockSchool.type.slice(1)} />
              <Separator />
              <InfoRow label="Currency" value={mockSchool.settings.currency} />
              <InfoRow label="Timezone" value={mockSchool.settings.timezone} />
              <InfoRow label="Academic Year" value={`${mockSchool.settings.academicYearStart} to ${mockSchool.settings.academicYearEnd}`} />
              <InfoRow label="Attendance Method" value={mockSchool.settings.attendanceMethod.charAt(0).toUpperCase() + mockSchool.settings.attendanceMethod.slice(1)} />
              <InfoRow label="Grading System" value={mockSchool.settings.gradingSystem.charAt(0).toUpperCase() + mockSchool.settings.gradingSystem.slice(1)} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="modules" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Module Configuration</CardTitle>
              <CardDescription>Enable or disable school modules</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {modules.map((mod) => (
                  <div key={mod.id} className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="font-medium">{mod.name}</p>
                      <p className="text-sm text-muted-foreground">{mod.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`module-${mod.id}`} className="sr-only">
                        {mod.name}
                      </Label>
                      <Switch
                        id={`module-${mod.id}`}
                        checked={enabledModules.includes(mod.id)}
                        onCheckedChange={() => toggleModule(mod.id)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <DataTable columns={userColumns} data={mockUsers} searchKey="name" searchPlaceholder="Search users..." />
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
