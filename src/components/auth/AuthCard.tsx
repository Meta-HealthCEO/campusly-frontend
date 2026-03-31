import type { ReactNode } from 'react';
import { GraduationCap } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';

type MaxWidth = 'sm' | 'md' | 'lg' | '2xl';

interface AuthCardProps {
  title: string;
  description: string;
  children: ReactNode;
  maxWidth?: MaxWidth;
}

const maxWidthMap: Record<MaxWidth, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  '2xl': 'max-w-2xl',
};

export function AuthCard({
  title,
  description,
  children,
  maxWidth = 'md',
}: AuthCardProps) {
  return (
    <Card className={`w-full ${maxWidthMap[maxWidth]}`}>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-600/10">
          <GraduationCap className="h-8 w-8 text-blue-600" />
        </div>
        <CardTitle className="text-2xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
