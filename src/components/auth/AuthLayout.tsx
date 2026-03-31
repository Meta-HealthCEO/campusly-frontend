import type { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-600/5 via-white to-indigo-600/5 px-4 py-12">
      {children}
    </div>
  );
}
