'use client';

import { Languages, Loader2, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LANGUAGE_OPTIONS, REWRITE_OPTIONS, type RewriteAction } from '@/lib/item-editing';

interface Props {
  busy: boolean;
  disabled?: boolean;
  onRewrite: (action: RewriteAction, language?: string) => void;
}

/** Ask the AI for another version of the item: easier, harder, shorter, simpler, translated, or new. */
export function RewriteMenu({ busy, disabled = false, onRewrite }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" disabled={busy || disabled} className="min-h-11 gap-1.5 sm:min-h-8" />}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Wand2 className="h-4 w-4" aria-hidden />}
        {busy ? 'Rewriting…' : 'Rewrite'}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {/* base-ui: a menu label must sit inside a group. */}
        <DropdownMenuGroup>
          <DropdownMenuLabel>Rewrite with AI</DropdownMenuLabel>
          {REWRITE_OPTIONS.map((o) => (
            <DropdownMenuItem key={o.action} onClick={() => onRewrite(o.action)}>{o.label}</DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger><Languages className="h-4 w-4" aria-hidden /> Translate</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {LANGUAGE_OPTIONS.map((l) => (
              <DropdownMenuItem key={l.code} onClick={() => onRewrite('translate', l.code)}>{l.label}</DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
