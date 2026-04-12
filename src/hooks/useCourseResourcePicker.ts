import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList, extractErrorMessage } from '@/lib/api-helpers';
import { toast } from 'sonner';

/**
 * A single hit in the resource picker, normalised across the four
 * source modules. Each kind uses the fields the course builder needs
 * to construct a CreateLessonInput when the teacher clicks it.
 */
export type ResourcePickerResult =
  | {
      kind: 'content';
      id: string;
      title: string;
      subtitle: string;
    }
  | {
      kind: 'chapter';
      id: string; // composite — textbookId:chapterId — for React keys
      title: string;
      subtitle: string;
      textbookId: string;
      chapterId: string;
    }
  | {
      kind: 'homework';
      id: string;
      title: string;
      subtitle: string;
    }
  | {
      kind: 'quiz_question';
      id: string; // a single question id; the dialog will batch selected ones
      title: string;
      subtitle: string;
    };

interface RawContentResource {
  id: string;
  title: string;
  subject?: { name?: string } | null;
  gradeId?: { name?: string } | null;
}

interface RawTextbook {
  id: string;
  title: string;
  chapters?: Array<{
    _id: string;
    title: string;
    description?: string;
  }>;
}

interface RawHomework {
  id: string;
  title: string;
  description?: string;
  subject?: { name?: string } | null;
}

interface RawQuestion {
  id: string;
  stem: string;
  type: string;
  marks: number;
}

/**
 * Fuzzy search hook for the course builder's resource picker.
 * Debounces the query by 250ms, fires the four searches in parallel,
 * normalises the results into ResourcePickerResult, and returns the
 * merged list.
 *
 * NOTE: The homework endpoint does not accept a `search` query param —
 * it is called without one and client-side filtering is used.
 */
export function useCourseResourcePicker() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ResourcePickerResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Don't fire until the teacher has typed at least 2 characters —
    // prevents a huge catalog dump on dialog open.
    if (!query || query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    const trimmed = query.trim();
    let cancelled = false;

    const timer = setTimeout(() => {
      void (async () => {
        setLoading(true);
        try {
          const [contentRes, textbookRes, homeworkRes, questionsRes] =
            await Promise.allSettled([
              apiClient.get('/content-library/resources', {
                params: { search: trimmed, status: 'approved', limit: 15 },
              }),
              apiClient.get('/textbooks', {
                params: { search: trimmed, status: 'published' },
              }),
              // Homework does not support a search param — fetch all and
              // filter client-side.
              apiClient.get('/homework'),
              apiClient.get('/question-bank/questions', {
                params: { search: trimmed, status: 'approved', limit: 15 },
              }),
            ]);

          if (cancelled) return;

          const merged: ResourcePickerResult[] = [];

          // Content resources
          if (contentRes.status === 'fulfilled') {
            const arr = unwrapList<RawContentResource>(contentRes.value);
            for (const r of arr.slice(0, 10)) {
              merged.push({
                kind: 'content',
                id: r.id,
                title: r.title,
                subtitle:
                  [r.subject?.name, r.gradeId?.name].filter(Boolean).join(' · ') ||
                  'Content Library',
              });
            }
          }

          // Textbook chapters — expand each textbook's chapters and match
          // chapter titles against the query client-side, since the backend
          // search matches textbook title only.
          if (textbookRes.status === 'fulfilled') {
            const books = unwrapList<RawTextbook>(textbookRes.value);
            const lcQuery = trimmed.toLowerCase();
            for (const book of books) {
              const chapters = book.chapters ?? [];
              const matching = chapters.filter((c) =>
                c.title.toLowerCase().includes(lcQuery),
              );
              // If the teacher's query hit a textbook but not a chapter,
              // include the first 3 chapters as fallback results.
              const toAdd = matching.length > 0 ? matching : chapters.slice(0, 3);
              for (const ch of toAdd.slice(0, 5)) {
                merged.push({
                  kind: 'chapter',
                  id: `${book.id}:${ch._id}`,
                  title: ch.title,
                  subtitle: book.title,
                  textbookId: book.id,
                  chapterId: ch._id,
                });
              }
            }
          }

          // Homework — client-side filter since backend has no search param.
          if (homeworkRes.status === 'fulfilled') {
            const lcQuery = trimmed.toLowerCase();
            const arr = unwrapList<RawHomework>(homeworkRes.value).filter(
              (h) =>
                h.title.toLowerCase().includes(lcQuery) ||
                (h.description ?? '').toLowerCase().includes(lcQuery),
            );
            for (const h of arr.slice(0, 10)) {
              merged.push({
                kind: 'homework',
                id: h.id,
                title: h.title,
                subtitle:
                  h.subject?.name ??
                  h.description?.slice(0, 80) ??
                  'Homework',
              });
            }
          }

          // Question bank questions
          if (questionsRes.status === 'fulfilled') {
            const arr = unwrapList<RawQuestion>(questionsRes.value);
            for (const q of arr.slice(0, 15)) {
              const stemPreview =
                q.stem.length > 80 ? q.stem.slice(0, 80) + '\u2026' : q.stem;
              merged.push({
                kind: 'quiz_question',
                id: q.id,
                title: stemPreview,
                subtitle: `${q.type} \u00b7 ${q.marks} mark${q.marks === 1 ? '' : 's'}`,
              });
            }
          }

          setResults(merged);
        } catch (err: unknown) {
          if (!cancelled) {
            toast.error(extractErrorMessage(err, 'Search failed'));
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const reset = useCallback(() => {
    setQuery('');
    setResults([]);
  }, []);

  return { query, setQuery, results, loading, reset };
}
