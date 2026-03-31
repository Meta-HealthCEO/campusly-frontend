'use client';

import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';

interface ConsentFormFilterProps {
  value: string;
  onChange: (value: string) => void;
}

export function ConsentFormFilter({ value, onChange }: ConsentFormFilterProps) {
  return (
    <Select
      value={value}
      onValueChange={(val: unknown) => onChange(val as string)}
    >
      <SelectTrigger className="w-[160px]">
        <SelectValue placeholder="Filter by type" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Types</SelectItem>
        <SelectItem value="trip">Trip</SelectItem>
        <SelectItem value="medical">Medical</SelectItem>
        <SelectItem value="general">General</SelectItem>
        <SelectItem value="photo">Photo</SelectItem>
        <SelectItem value="data">Data</SelectItem>
      </SelectContent>
    </Select>
  );
}
