import { describe, expect, it } from 'vitest';
import { buildSubstituteColumns, SUBSTITUTE_SEARCH_KEY } from '../src/components/attendance/substitute-columns';

const noop = () => undefined;

describe('substitute table columns', () => {
  it('has the column the table searches on', () => {
    const columns = buildSubstituteColumns({ onApprove: noop, onDecline: noop, onEdit: noop, onDelete: noop });
    const ids = columns.map((c) => c.id ?? (c as { accessorKey?: string }).accessorKey);
    expect(ids).toContain(SUBSTITUTE_SEARCH_KEY);
  });
});
