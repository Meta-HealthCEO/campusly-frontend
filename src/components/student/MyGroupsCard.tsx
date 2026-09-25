import { Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { LearnerGroup } from '@/lib/learner-groups';

/** The learner's groups and who teaches them (spec §2). */
export function MyGroupsCard({ groups }: { groups: LearnerGroup[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Users className="size-4 text-muted-foreground" aria-hidden /> My groups</CardTitle>
      </CardHeader>
      <CardContent>
        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">You&apos;re not in a group yet. Join one with your teacher&apos;s code below.</p>
        ) : (
          <ul className="divide-y divide-border">
            {groups.map((g: LearnerGroup) => (
              <li key={g.id} className="py-3 first:pt-0 last:pb-0">
                <p className="truncate font-medium">{g.name}</p>
                <p className="truncate text-sm text-muted-foreground">{[g.subject, `Teacher: ${g.teacher}`].filter(Boolean).join(' · ')}</p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
