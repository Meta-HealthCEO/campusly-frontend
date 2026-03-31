import type { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#2563EB]/5 via-white to-[#4F46E5]/5 px-4 py-12">
      {children}
    </div>
  );
}
