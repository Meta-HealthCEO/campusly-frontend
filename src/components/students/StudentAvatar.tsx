'use client';

import { useMemo } from 'react';

interface StudentAvatarProps {
  photoUrl?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses: Record<string, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-16 w-16 text-lg',
};

const colors = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-purple-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-indigo-500',
  'bg-teal-500',
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

export function StudentAvatar({ photoUrl, name, size = 'md' }: StudentAvatarProps) {
  const initials = useMemo(() => getInitials(name), [name]);
  const colorClass = useMemo(() => colors[hashString(name) % colors.length], [name]);
  const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? 'http://localhost:4500';

  if (photoUrl) {
    const src = photoUrl.startsWith('http') ? photoUrl : `${apiBase}${photoUrl}`;
    return (
      <img
        src={src}
        alt={name}
        className={`${sizeClasses[size]} rounded-full object-cover flex-shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} ${colorClass} rounded-full flex items-center justify-center text-white font-medium flex-shrink-0`}
    >
      {initials}
    </div>
  );
}
