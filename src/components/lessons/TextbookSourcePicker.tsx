'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useTextbooks } from '@/hooks/useTextbooks';
import type { TextbookRef } from '@/types/lesson';

const EXCERPT_MAX = 8000;

type SourceMode = 'internal' | 'external';

interface InternalState { textbookId: string; chapterId: string; pageStart: string; pageEnd: string }
interface ExternalState {
  title: string; publisher: string; isbn: string; pageStart: string; pageEnd: string; excerpt: string;
}

const EMPTY_INTERNAL: InternalState = { textbookId: '', chapterId: '', pageStart: '', pageEnd: '' };
const EMPTY_EXTERNAL: ExternalState = {
  title: '', publisher: '', isbn: '', pageStart: '', pageEnd: '', excerpt: '',
};

interface Props {
  value: TextbookRef | null;
  onChange: (v: TextbookRef) => void;
}

function toInt(s: string): number | undefined {
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
}

function initInternal(value: TextbookRef | null): InternalState {
  if (value?.source !== 'internal') return EMPTY_INTERNAL;
  return {
    textbookId: value.textbookId,
    chapterId: value.chapterId ?? '',
    pageStart: value.pageStart ? String(value.pageStart) : '',
    pageEnd: value.pageEnd ? String(value.pageEnd) : '',
  };
}

function initExternal(value: TextbookRef | null): ExternalState {
  if (value?.source !== 'external') return EMPTY_EXTERNAL;
  return {
    title: value.title,
    publisher: value.publisher ?? '',
    isbn: value.isbn ?? '',
    pageStart: value.pageStart ? String(value.pageStart) : '',
    pageEnd: value.pageEnd ? String(value.pageEnd) : '',
    excerpt: value.excerpt ?? '',
  };
}

function buildInternalRef(s: InternalState): TextbookRef | null {
  if (!s.textbookId) return null;
  const ps = toInt(s.pageStart); const pe = toInt(s.pageEnd);
  return {
    source: 'internal',
    textbookId: s.textbookId,
    ...(s.chapterId ? { chapterId: s.chapterId } : {}),
    ...(ps !== undefined ? { pageStart: ps } : {}),
    ...(pe !== undefined ? { pageEnd: pe } : {}),
  };
}

function buildExternalRef(s: ExternalState): TextbookRef | null {
  if (!s.title.trim()) return null;
  const ps = toInt(s.pageStart); const pe = toInt(s.pageEnd);
  return {
    source: 'external',
    title: s.title.trim(),
    ...(s.publisher ? { publisher: s.publisher } : {}),
    ...(s.isbn ? { isbn: s.isbn } : {}),
    ...(ps !== undefined ? { pageStart: ps } : {}),
    ...(pe !== undefined ? { pageEnd: pe } : {}),
    ...(s.excerpt ? { excerpt: s.excerpt } : {}),
  };
}

interface PageRangeProps {
  idPrefix: string;
  start: string; end: string;
  onChange: (patch: { pageStart?: string; pageEnd?: string }) => void;
}

function PageRange({ idPrefix, start, end, onChange }: PageRangeProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <Label htmlFor={`${idPrefix}-page-start`}>Page start</Label>
        <Input id={`${idPrefix}-page-start`} type="number" min={1} className="w-full"
          value={start} onChange={(e) => onChange({ pageStart: e.target.value })} />
      </div>
      <div>
        <Label htmlFor={`${idPrefix}-page-end`}>Page end</Label>
        <Input id={`${idPrefix}-page-end`} type="number" min={1} className="w-full"
          value={end} onChange={(e) => onChange({ pageEnd: e.target.value })} />
      </div>
    </div>
  );
}

export function TextbookSourcePicker({ value, onChange }: Props) {
  const { textbooks, fetchTextbooks, loading } = useTextbooks();
  const [mode, setMode] = useState<SourceMode>(value?.source === 'external' ? 'external' : 'internal');
  const [internal, setInternal] = useState<InternalState>(() => initInternal(value));
  const [external, setExternal] = useState<ExternalState>(() => initExternal(value));

  useEffect(() => { fetchTextbooks(); }, [fetchTextbooks]);

  const updateInternal = (patch: Partial<InternalState>) => {
    setInternal((prev) => {
      const next = { ...prev, ...patch };
      if (patch.textbookId !== undefined && patch.textbookId !== prev.textbookId) next.chapterId = '';
      const ref = buildInternalRef(next);
      if (ref) onChange(ref);
      return next;
    });
  };

  const updateExternal = (patch: Partial<ExternalState>) => {
    setExternal((prev) => {
      const next = { ...prev, ...patch };
      const ref = buildExternalRef(next);
      if (ref) onChange(ref);
      return next;
    });
  };

  const selectedTextbook = textbooks.find((t) => t.id === internal.textbookId) ?? null;
  const chapters = selectedTextbook?.chapters ?? [];

  const tabClass = (active: boolean) =>
    `flex-1 px-3 py-2 rounded-md border text-sm transition-colors ${
      active ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted'
    }`;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <button type="button" onClick={() => setMode('internal')} className={tabClass(mode === 'internal')}>
          Internal CAPS textbook
        </button>
        <button type="button" onClick={() => setMode('external')} className={tabClass(mode === 'external')}>
          External textbook
        </button>
      </div>

      {mode === 'internal' && (
        <div className="space-y-3">
          <div>
            <Label>Textbook <span className="text-destructive">*</span></Label>
            <Select value={internal.textbookId || undefined}
              onValueChange={(v: unknown) => updateInternal({ textbookId: String(v) })}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={loading ? 'Loading textbooks…' : 'Select a textbook'} />
              </SelectTrigger>
              <SelectContent>
                {textbooks.map((tb) => (<SelectItem key={tb.id} value={tb.id}>{tb.title}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Chapter</Label>
            <Select value={internal.chapterId || undefined}
              onValueChange={(v: unknown) => updateInternal({ chapterId: String(v) })}
              disabled={!internal.textbookId || chapters.length === 0}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={
                  !internal.textbookId ? 'Pick a textbook first'
                    : chapters.length === 0 ? 'No chapters available' : 'Select a chapter (optional)'
                } />
              </SelectTrigger>
              <SelectContent>
                {chapters.map((ch) => (<SelectItem key={ch.id} value={ch.id}>{ch.title}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <PageRange idPrefix="int" start={internal.pageStart} end={internal.pageEnd} onChange={updateInternal} />
        </div>
      )}

      {mode === 'external' && (
        <div className="space-y-3">
          <div>
            <Label htmlFor="ext-title">Title <span className="text-destructive">*</span></Label>
            <Input id="ext-title" className="w-full" value={external.title}
              onChange={(e) => updateExternal({ title: e.target.value })}
              placeholder="e.g. Platinum Mathematics Grade 8" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="ext-publisher">Publisher</Label>
              <Input id="ext-publisher" className="w-full" value={external.publisher}
                onChange={(e) => updateExternal({ publisher: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="ext-isbn">ISBN</Label>
              <Input id="ext-isbn" className="w-full" value={external.isbn}
                onChange={(e) => updateExternal({ isbn: e.target.value })} />
            </div>
          </div>
          <PageRange idPrefix="ext" start={external.pageStart} end={external.pageEnd} onChange={updateExternal} />
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="ext-excerpt">Excerpt</Label>
              <span className="text-xs text-muted-foreground">{external.excerpt.length} / {EXCERPT_MAX}</span>
            </div>
            <Textarea id="ext-excerpt" className="w-full min-h-36" value={external.excerpt}
              onChange={(e) => updateExternal({ excerpt: e.target.value.slice(0, EXCERPT_MAX) })}
              placeholder="Paste the relevant passage so AI can generate accurate comprehension questions." />
          </div>
        </div>
      )}
    </div>
  );
}
