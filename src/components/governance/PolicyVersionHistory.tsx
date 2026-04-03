'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { History, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import type { PolicyVersion } from '@/types';

interface PolicyVersionHistoryProps {
  versions: PolicyVersion[];
  currentVersion: number;
}

export function PolicyVersionHistory({
  versions,
  currentVersion,
}: PolicyVersionHistoryProps) {
  const [expandedVersion, setExpandedVersion] = useState<number | null>(null);

  const toggleVersion = (version: number) => {
    setExpandedVersion((prev) => (prev === version ? null : version));
  };

  if (versions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Version History</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={History}
            title="No previous versions"
            description="This policy has not been updated yet."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Version History</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {versions.map((v) => {
            const isExpanded = expandedVersion === v.version;
            const isCurrent = v.version === currentVersion;
            const hasContent = Boolean(v.content || v.fileUrl);

            return (
              <li key={v.version} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium flex-shrink-0">v{v.version}</span>
                    {isCurrent && (
                      <Badge variant="default" className="flex-shrink-0">
                        Current
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground truncate">
                      {new Date(v.updatedAt).toLocaleDateString('en-ZA')} &mdash;{' '}
                      {v.updatedBy}
                    </span>
                  </div>
                  {hasContent && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleVersion(v.version)}
                      aria-expanded={isExpanded}
                      className="flex-shrink-0"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                      <span className="sr-only">
                        {isExpanded ? 'Collapse' : 'Expand'} version {v.version}
                      </span>
                    </Button>
                  )}
                </div>

                {isExpanded && (
                  <div className="pt-2 border-t space-y-2">
                    {v.fileUrl && (
                      <a
                        href={v.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline text-sm"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View archived document
                      </a>
                    )}
                    {v.content && (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                        {v.content}
                      </p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
