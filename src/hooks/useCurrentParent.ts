import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Student, User } from '@/types';

interface ParentRecord {
  id: string;
  _id?: string;
  userId: string | (User & { _id?: string });
  childrenIds: (Student & { _id?: string })[];
  relationship: string;
  occupation?: string;
  employer?: string;
}

interface CurrentParentResult {
  parent: ParentRecord | null;
  children: Student[];
  loading: boolean;
}

function normalizeStudent(raw: Student & { _id?: string }): Student {
  return { ...raw, id: raw._id ?? raw.id };
}

export function useCurrentParent(): CurrentParentResult {
  const { user } = useAuthStore();
  const [parent, setParent] = useState<ParentRecord | null>(null);
  const [children, setChildren] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    async function resolve() {
      try {
        const res = await apiClient.get('/parents/me');
        const raw = res.data.data ?? res.data;

        const me: ParentRecord = {
          ...raw,
          id: raw._id ?? raw.id,
        };
        setParent(me);

        // childrenIds is populated with Student records by the backend
        const kids = (me.childrenIds ?? []).map(normalizeStudent);
        setChildren(kids);
      } catch {
        console.error('Failed to resolve current parent');
      } finally {
        setLoading(false);
      }
    }

    resolve();
  }, [user]);

  return { parent, children, loading };
}
