'use client';

import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { UserCheck } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useTeacherSubstitutes } from '@/hooks/useTeacherSubstitutes';
import type { SubstituteRecord } from '@/hooks/useTeacherSubstitutes';
import {
  SubstituteStatusBadge,
  SubstituteCategoryBadge,
} from '@/components/attendance';

function resolveTeacherName(
  val: string | { _id: string; firstName?: string; lastName?: string } | null | undefined,
): string {
  if (!val || typeof val === 'string') return val ?? 'Unknown';
  const parts = [val.firstName, val.lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : 'Unknown';
}

function resolveClassNames(
  classIds: Array<string | { _id: string; name?: string }>,
): string {
  return classIds
    .map((c) => (typeof c === 'object' && c !== null ? c.name ?? '' : ''))
    .filter(Boolean)
    .join(', ') || '-';
}

function buildColumns(
  partnerKey: 'originalTeacherId' | 'substituteTeacherId',
  partnerLabel: string,
): ColumnDef<SubstituteRecord, unknown>[] {
  return [
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => formatDate(row.original.date),
    },
    {
      accessorKey: partnerKey,
      header: partnerLabel,
      cell: ({ row }) => (
        <span className="font-medium truncate">
          {resolveTeacherName(row.original[partnerKey])}
        </span>
      ),
    },
    {
      accessorKey: 'periods',
      header: 'Periods',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.periods.map((p: number) => (
            <Badge key={p} variant="outline" className="text-xs">
              P{p}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      accessorKey: 'classIds',
      header: 'Classes',
      cell: ({ row }) => (
        <span className="text-sm truncate">{resolveClassNames(row.original.classIds)}</span>
      ),
    },
    {
      accessorKey: 'reasonCategory',
      header: 'Category',
      cell: ({ row }) => row.original.reasonCategory ? (
        <SubstituteCategoryBadge category={row.original.reasonCategory} />
      ) : <span className="text-xs text-muted-foreground">-</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => row.original.status ? (
        <div className="flex flex-col gap-1">
          <SubstituteStatusBadge status={row.original.status} />
          {row.original.status === 'declined' && row.original.declineReason && (
            <span
              className="text-[10px] text-destructive max-w-40 truncate"
              title={row.original.declineReason}
            >
              {row.original.declineReason}
            </span>
          )}
        </div>
      ) : null,
    },
    {
      accessorKey: 'reason',
      header: 'Notes',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground truncate">
          {row.original.reason || '-'}
        </span>
      ),
    },
  ];
}

const mySubColumns = buildColumns('substituteTeacherId', 'Substitute Teacher');
const coveringColumns = buildColumns('originalTeacherId', 'Original Teacher');

function isHidden(s: SubstituteRecord): boolean {
  return s.status === 'declined' || s.status === 'cancelled';
}

export default function TeacherSubstitutesPage() {
  const { mySubstitutions, coveringFor, loading } = useTeacherSubstitutes();
  const [showAll, setShowAll] = useState(false);

  const filteredMine = useMemo(
    () => (showAll ? mySubstitutions : mySubstitutions.filter((s) => !isHidden(s))),
    [mySubstitutions, showAll],
  );
  const filteredCovering = useMemo(
    () => (showAll ? coveringFor : coveringFor.filter((s) => !isHidden(s))),
    [coveringFor, showAll],
  );

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Substitute Assignments"
        description="View substitute teacher assignments for your classes"
      />

      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={showAll}
          onCheckedChange={(c: boolean) => setShowAll(c)}
        />
        Show declined and cancelled
      </label>

      <Tabs defaultValue="my-subs">
        <TabsList className="flex-wrap">
          <TabsTrigger value="my-subs">
            My Substitutions ({filteredMine.length})
          </TabsTrigger>
          <TabsTrigger value="covering">
            Covering For ({filteredCovering.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-subs">
          {filteredMine.length === 0 ? (
            <EmptyState
              icon={UserCheck}
              title="No substitutions"
              description="No one is currently substituting for you."
            />
          ) : (
            <DataTable
              columns={mySubColumns}
              data={filteredMine}
              searchKey="reason"
              searchPlaceholder="Search by reason..."
            />
          )}
        </TabsContent>

        <TabsContent value="covering">
          {filteredCovering.length === 0 ? (
            <EmptyState
              icon={UserCheck}
              title="Not covering anyone"
              description="You are not currently assigned as a substitute."
            />
          ) : (
            <DataTable
              columns={coveringColumns}
              data={filteredCovering}
              searchKey="reason"
              searchPlaceholder="Search by reason..."
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
