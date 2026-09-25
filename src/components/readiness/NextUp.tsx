import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button-variants';
import { Card, CardContent } from '@/components/ui/card';

interface NextUpProps {
  eyebrow: string;
  title: string;
  detail?: string;
  actionLabel: string;
  href: string;
}

/** Spec §1: one "next up" action per screen. A plain card; its one emphasis is the filled button (ruling O1 revised). */
export function NextUp({ eyebrow, title, detail, actionLabel, href }: NextUpProps) {
  return (
    <Card>
      <CardContent className="space-y-2">
        <p className="text-eyebrow font-semibold uppercase text-muted-foreground">{eyebrow}</p>
        <p className="font-heading text-h3 font-semibold leading-snug">{title}</p>
        {detail && <p className="text-sm text-muted-foreground">{detail}</p>}
        <Link href={href} className={buttonVariants({ size: 'lg' })}>{actionLabel}</Link>
      </CardContent>
    </Card>
  );
}
