'use client';

import type { VideoFilters, VideoType } from '@/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search } from 'lucide-react';

interface VideoFilterProps {
  filters: VideoFilters;
  onChange: (filters: VideoFilters) => void;
}

const VIDEO_TYPES: { value: VideoType; label: string }[] = [
  { value: 'upload', label: 'Upload' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'vimeo', label: 'Vimeo' },
  { value: 'recording', label: 'Recording' },
];

export function VideoFilter({ filters, onChange }: VideoFilterProps) {
  function set(partial: Partial<VideoFilters>) {
    onChange({ ...filters, ...partial, page: 1 });
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      {/* Search */}
      <div className="flex flex-col gap-1 w-full sm:w-64">
        <Label className="text-xs text-muted-foreground">Search</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search videos..."
            value={filters.search ?? ''}
            onChange={(e) => set({ search: e.target.value || undefined })}
            className="pl-9 w-full"
          />
        </div>
      </div>

      {/* Subject */}
      <div className="flex flex-col gap-1 w-full sm:w-44">
        <Label className="text-xs text-muted-foreground">Subject</Label>
        <Input
          placeholder="Subject ID or name"
          value={filters.subjectId ?? ''}
          onChange={(e) => set({ subjectId: e.target.value || undefined })}
          className="w-full"
        />
      </div>

      {/* Video Type */}
      <div className="flex flex-col gap-1 w-full sm:w-40">
        <Label className="text-xs text-muted-foreground">Type</Label>
        <Select
          value={filters.videoType ?? 'all'}
          onValueChange={(val) =>
            set({ videoType: val === 'all' ? undefined : val })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {VIDEO_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Published */}
      <div className="flex flex-col gap-1 w-full sm:w-36">
        <Label className="text-xs text-muted-foreground">Published</Label>
        <Select
          value={
            filters.isPublished === undefined
              ? 'all'
              : filters.isPublished
              ? 'yes'
              : 'no'
          }
          onValueChange={(val) =>
            set({
              isPublished:
                val === 'all' ? undefined : val === 'yes' ? true : false,
            })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="yes">Published</SelectItem>
            <SelectItem value="no">Unpublished</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
