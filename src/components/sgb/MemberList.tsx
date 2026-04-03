'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Trash2 } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import type { SgbMember, SgbPosition, SgbMemberStatus } from '@/types';

interface MemberListProps {
  members: SgbMember[];
  isAdmin: boolean;
  onDelete?: (id: string) => void;
}

const POSITION_LABEL: Record<SgbPosition, string> = {
  chairperson: 'Chairperson',
  deputy_chairperson: 'Deputy Chairperson',
  secretary: 'Secretary',
  treasurer: 'Treasurer',
  member: 'Member',
  co_opted: 'Co-opted',
};

const STATUS_VARIANT: Record<SgbMemberStatus, 'default' | 'secondary' | 'outline'> = {
  pending: 'outline',
  active: 'default',
  inactive: 'secondary',
};

export function MemberList({ members, isAdmin, onDelete }: MemberListProps) {
  if (members.length === 0) {
    return <EmptyState icon={Users} title="No members" description="No SGB members have been invited yet." />;
  }

  return (
    <div className="space-y-2">
      {members.map((member) => (
        <Card key={member.id}>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-medium">{member.firstName} {member.lastName}</h4>
                  <Badge variant={STATUS_VARIANT[member.status]}>{member.status}</Badge>
                  <Badge variant="outline">{POSITION_LABEL[member.position]}</Badge>
                </div>
                <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                {member.term && (
                  <p className="text-xs text-muted-foreground">Term: {member.term}</p>
                )}
              </div>
              {isAdmin && onDelete && (
                <Button size="sm" variant="outline" onClick={() => onDelete(member.id)} className="shrink-0">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
