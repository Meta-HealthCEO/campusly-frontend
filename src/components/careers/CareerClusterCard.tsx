'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface CareerClusterCardProps {
  name: string;
  description?: string;
  score?: number;
  count?: number;
  active?: boolean;
  onClick?: (cluster: string) => void;
}

export function CareerClusterCard({
  name,
  description,
  score,
  count,
  active = false,
  onClick,
}: CareerClusterCardProps) {
  const isClickable = !!onClick;

  return (
    <Card
      className={cn(
        'transition-colors',
        isClickable && 'cursor-pointer hover:border-primary',
        active && 'border-primary bg-primary/5'
      )}
      onClick={isClickable ? () => onClick(name) : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable
          ? (e: React.KeyboardEvent<HTMLDivElement>) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick(name);
              }
            }
          : undefined
      }
    >
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold truncate">{name}</h3>
          {count != null && (
            <Badge variant="secondary" className="shrink-0">
              {count} {count === 1 ? 'career' : 'careers'}
            </Badge>
          )}
        </div>

        {score != null && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Aptitude match</span>
              <span className="font-medium text-foreground">{score}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.min(Math.max(score, 0), 100)}%` }}
              />
            </div>
          </div>
        )}

        {description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
