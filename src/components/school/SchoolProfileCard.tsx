'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { SchoolDocument } from '@/types';

interface SchoolProfileCardProps {
  school: SchoolDocument;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

const typeLabels: Record<NonNullable<SchoolDocument['type']>, string> = {
  primary: 'Primary',
  secondary: 'Secondary',
  combined: 'Combined',
  special: 'Special',
};

export function SchoolProfileCard({ school }: SchoolProfileCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle>{school.name}</CardTitle>
            {school.principal && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                Principal: {school.principal}
              </p>
            )}
          </div>
          {school.type && (
            <Badge variant="secondary">{typeLabels[school.type]}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Address
          </p>
          <div className="space-y-1">
            <InfoRow label="Street" value={school.address.street} />
            <InfoRow label="City" value={school.address.city} />
            <InfoRow label="Province" value={school.address.province} />
            <InfoRow label="Postal Code" value={school.address.postalCode} />
            <InfoRow label="Country" value={school.address.country} />
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Contact
          </p>
          <div className="space-y-1">
            <InfoRow label="Email" value={school.contactInfo.email} />
            <InfoRow label="Phone" value={school.contactInfo.phone} />
            {school.contactInfo.website && (
              <InfoRow label="Website" value={school.contactInfo.website} />
            )}
          </div>
        </div>

        {school.emisNumber && (
          <>
            <Separator />
            <InfoRow label="EMIS Number" value={school.emisNumber} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
