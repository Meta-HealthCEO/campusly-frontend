'use client';

import type { University } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, MapPin, Calendar, GraduationCap } from 'lucide-react';

interface UniversityCardProps {
  university: University;
  onClick?: (id: string) => void;
}

const TYPE_LABELS: Record<University['type'], string> = {
  traditional: 'Traditional',
  comprehensive: 'Comprehensive',
  university_of_technology: 'University of Technology',
  tvet: 'TVET College',
  private: 'Private',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
  });
}

function formatFee(cents: number): string {
  return `R ${(cents / 100).toLocaleString('en-ZA')}`;
}

export function UniversityCard({ university, onClick }: UniversityCardProps) {
  const hasApplicationDates =
    university.applicationOpenDate && university.applicationCloseDate;

  return (
    <Card
      className={onClick ? 'cursor-pointer transition-shadow hover:shadow-md' : undefined}
      onClick={onClick ? () => onClick(university.id) : undefined}
    >
      <CardContent className="flex gap-3 p-4">
        {/* Logo / placeholder */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border bg-muted">
          {university.logo ? (
            <img
              src={university.logo}
              alt={`${university.name} logo`}
              className="h-10 w-10 rounded object-contain"
            />
          ) : (
            <Building2 className="h-6 w-6 text-muted-foreground" />
          )}
        </div>

        {/* Details */}
        <div className="min-w-0 flex-1 space-y-1.5">
          {/* Name */}
          <div>
            <h3 className="font-semibold leading-tight truncate">
              {university.name}{' '}
              <span className="font-normal text-muted-foreground">
                ({university.shortName})
              </span>
            </h3>
          </div>

          {/* Type badge */}
          <Badge variant="outline" className="text-xs">
            {TYPE_LABELS[university.type]}
          </Badge>

          {/* Location */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {university.city}, {university.province}
            </span>
          </div>

          {/* Application dates */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            {hasApplicationDates ? (
              <span>
                Applications: {formatDate(university.applicationOpenDate!)} &mdash;{' '}
                {formatDate(university.applicationCloseDate!)}
              </span>
            ) : (
              <span>Dates TBA</span>
            )}
          </div>

          {/* Fee + programme count */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {university.applicationFee > 0 && (
              <span>Fee: {formatFee(university.applicationFee)}</span>
            )}
            {university.programmeCount != null && (
              <span className="flex items-center gap-1">
                <GraduationCap className="h-3.5 w-3.5 shrink-0" />
                {university.programmeCount} programmes
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
