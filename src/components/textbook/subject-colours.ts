// ── Subject Colours ──────────────────────────────────────────

const SUBJECT_COLOURS: [RegExp, string, string][] = [
  [/mathematical.*lit/i, '#ec4899', '#db2777'],
  [/^mathematics$/i, '#2563eb', '#1d4ed8'],
  [/life.*sci/i, '#059669', '#047857'],
  [/physical.*sci/i, '#dc2626', '#b91c1c'],
  [/natural.*sci/i, '#0d9488', '#0f766e'],
  [/history/i, '#7c3aed', '#6d28d9'],
  [/geography/i, '#0891b2', '#0e7490'],
  [/economics/i, '#ea580c', '#c2410c'],
  [/business/i, '#d97706', '#b45309'],
  [/accounting/i, '#4f46e5', '#4338ca'],
  [/life.*orient/i, '#65a30d', '#4d7c0f'],
  [/ems|economic.*management/i, '#ca8a04', '#a16207'],
  [/technology/i, '#475569', '#334155'],
  [/creative.*art/i, '#d946ef', '#a21caf'],
  [/social.*sci/i, '#e11d48', '#be123c'],
  [/tourism/i, '#0284c7', '#0369a1'],
  [/information.*tech/i, '#059669', '#047857'],
  [/computer.*app/i, '#8b5cf6', '#7c3aed'],
];

const FALLBACK_COLOUR: [string, string] = ['#6b7280', '#4b5563'];

export function getSubjectColours(subjectName: string): { from: string; to: string } {
  for (const [pattern, from, to] of SUBJECT_COLOURS) {
    if (pattern.test(subjectName)) return { from, to };
  }
  return { from: FALLBACK_COLOUR[0], to: FALLBACK_COLOUR[1] };
}

// ── Subject Images ──────────────────────────────────────────
// Unsplash source URLs — free, no API key needed, served via CDN.
// Each URL fetches a relevant, cropped photo at 280x400 (2x cover size).

const SUBJECT_IMAGES: [RegExp, string][] = [
  [/mathematical.*lit/i, 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=280&h=400&fit=crop&crop=center'],
  [/^mathematics$/i, 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=280&h=400&fit=crop&crop=center'],
  [/life.*sci/i, 'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=280&h=400&fit=crop&crop=center'],
  [/physical.*sci/i, 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=280&h=400&fit=crop&crop=center'],
  [/natural.*sci/i, 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=280&h=400&fit=crop&crop=center'],
  [/history/i, 'https://images.unsplash.com/photo-1604580864964-0462f5d5b1a8?w=280&h=400&fit=crop&crop=center'],
  [/geography/i, 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=280&h=400&fit=crop&crop=center'],
  [/economics/i, 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=280&h=400&fit=crop&crop=center'],
  [/business/i, 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=280&h=400&fit=crop&crop=center'],
  [/accounting/i, 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=280&h=400&fit=crop&crop=center'],
  [/life.*orient/i, 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=280&h=400&fit=crop&crop=center'],
  [/ems|economic.*management/i, 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=280&h=400&fit=crop&crop=center'],
  [/technology/i, 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=280&h=400&fit=crop&crop=center'],
  [/creative.*art/i, 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=280&h=400&fit=crop&crop=center'],
  [/social.*sci/i, 'https://images.unsplash.com/photo-1521295121783-8a321d551ad2?w=280&h=400&fit=crop&crop=center'],
  [/tourism/i, 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=280&h=400&fit=crop&crop=center'],
  [/information.*tech/i, 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=280&h=400&fit=crop&crop=center'],
  [/computer.*app/i, 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=280&h=400&fit=crop&crop=center'],
];

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=280&h=400&fit=crop&crop=center';

export function getSubjectImage(subjectName: string): string {
  for (const [pattern, url] of SUBJECT_IMAGES) {
    if (pattern.test(subjectName)) return url;
  }
  return FALLBACK_IMAGE;
}
