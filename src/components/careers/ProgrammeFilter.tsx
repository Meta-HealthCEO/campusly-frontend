'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search } from 'lucide-react';
import { SA_PROVINCES } from '@/lib/constants';

export interface ProgrammeFilterValues {
  search: string;
  universityId: string;
  qualificationType: string;
  field: string;
  province: string;
  matchStatus: string;
}

interface ProgrammeFilterProps {
  onFilterChange: (filters: ProgrammeFilterValues) => void;
  universities: { id: string; name: string }[];
}

const INITIAL_FILTERS: ProgrammeFilterValues = {
  search: '',
  universityId: '',
  qualificationType: '',
  field: '',
  province: '',
  matchStatus: '',
};

export function ProgrammeFilter({ onFilterChange, universities }: ProgrammeFilterProps) {
  const [filters, setFilters] = useState<ProgrammeFilterValues>(INITIAL_FILTERS);

  const updateFilter = useCallback(
    (key: keyof ProgrammeFilterValues, value: string) => {
      setFilters((prev) => {
        const next = { ...prev, [key]: value };
        onFilterChange(next);
        return next;
      });
    },
    [onFilterChange]
  );

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        {/* Row 1: Search + Match Status */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative w-full sm:flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search programmes..."
              value={filters.search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                updateFilter('search', e.target.value)
              }
              className="pl-9"
            />
          </div>

          <Select
            value={filters.matchStatus}
            onValueChange={(val: unknown) => updateFilter('matchStatus', val as string)}
          >
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Match status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All</SelectItem>
              <SelectItem value="eligible">Eligible</SelectItem>
              <SelectItem value="close">Close Match</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Row 2: University + Province + Qualification Type */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Select
            value={filters.universityId}
            onValueChange={(val: unknown) => updateFilter('universityId', val as string)}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="University" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Universities</SelectItem>
              {universities.map((uni) => (
                <SelectItem key={uni.id} value={uni.id}>
                  {uni.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.province}
            onValueChange={(val: unknown) => updateFilter('province', val as string)}
          >
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Province" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Provinces</SelectItem>
              {SA_PROVINCES.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.qualificationType}
            onValueChange={(val: unknown) => updateFilter('qualificationType', val as string)}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Qualification" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Types</SelectItem>
              <SelectItem value="bachelor">Bachelor</SelectItem>
              <SelectItem value="diploma">Diploma</SelectItem>
              <SelectItem value="higher_certificate">Higher Certificate</SelectItem>
              <SelectItem value="postgrad_diploma">Postgrad Diploma</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Row 3: Field of study */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Field of study..."
            value={filters.field}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              updateFilter('field', e.target.value)
            }
            className="w-full sm:flex-1"
          />
        </div>
      </CardContent>
    </Card>
  );
}
