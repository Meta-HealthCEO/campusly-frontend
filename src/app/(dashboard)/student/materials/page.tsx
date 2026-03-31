'use client';

import { useEffect, useState } from 'react';
import { BookOpen, FileText, Video, ClipboardList, Link2, File, Download } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { useLearningStore } from '@/stores/useLearningStore';
import { getPopulatedName, getTeacherName } from '@/components/learning/types';
import { useAcademicFilters } from '@/hooks/useStudentMaterials';
import type { StudyMaterial } from '@/components/learning/types';
import { formatDate } from '@/lib/utils';

const typeIcons: Record<string, typeof FileText> = {
  notes: FileText, video: Video, past_paper: ClipboardList, link: Link2, document: File,
};
const typeStyles: Record<string, string> = {
  notes: 'bg-blue-100 text-blue-800', video: 'bg-purple-100 text-purple-800',
  past_paper: 'bg-amber-100 text-amber-800', link: 'bg-teal-100 text-teal-800', document: 'bg-slate-100 text-slate-800',
};
const typeLabels: Record<string, string> = {
  notes: 'Notes', video: 'Video', past_paper: 'Past Paper', link: 'Link', document: 'Document',
};

export default function StudentMaterialsPage() {
  const { materials, materialsLoading, fetchMaterials, recordDownload } = useLearningStore();
  const { subjects } = useAcademicFilters();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  const handleOpen = (material: StudyMaterial) => {
    recordDownload(material.id);
    const url = material.fileUrl ?? material.videoUrl ?? material.externalLink;
    if (url) window.open(url, '_blank');
  };

  const filtered = materials.filter((m) => {
    if (search && !m.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter && typeFilter !== 'all' && m.type !== typeFilter) return false;
    if (subjectFilter && subjectFilter !== 'all') {
      const sid = typeof m.subjectId === 'string' ? m.subjectId : m.subjectId?._id ?? '';
      if (sid !== subjectFilter) return false;
    }
    return true;
  });

  if (materialsLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="Study Materials" description="Browse study materials uploaded by your teachers." />

      <div className="flex flex-wrap gap-3">
        <Input
          className="w-64"
          placeholder="Search materials..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={typeFilter} onValueChange={(v: unknown) => setTypeFilter(v as string)}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="notes">Notes</SelectItem>
            <SelectItem value="video">Video</SelectItem>
            <SelectItem value="past_paper">Past Paper</SelectItem>
            <SelectItem value="link">Link</SelectItem>
            <SelectItem value="document">Document</SelectItem>
          </SelectContent>
        </Select>
        <Select value={subjectFilter} onValueChange={(v: unknown) => setSubjectFilter(v as string)}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All subjects" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All subjects</SelectItem>
            {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={BookOpen} title="No Materials" description="No study materials match your filters." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => {
            const Icon = typeIcons[m.type] ?? FileText;
            return (
              <Card key={m.id} className="flex flex-col">
                <CardContent className="p-5 flex-1 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold truncate">{m.title}</h3>
                      <p className="text-xs text-muted-foreground">{getPopulatedName(m.subjectId)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className={typeStyles[m.type] ?? ''}>
                      {typeLabels[m.type] ?? m.type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{getPopulatedName(m.gradeId)}</span>
                  </div>
                  {m.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{m.description}</p>
                  )}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>By {getTeacherName(m.teacherId)}</span>
                    <span>{formatDate(m.createdAt)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Download className="h-3 w-3" /> {m.downloads}
                    </span>
                    <Button size="xs" onClick={() => handleOpen(m)}>Open</Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
