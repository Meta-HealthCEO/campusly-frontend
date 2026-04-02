'use client';

import { useState, useRef } from 'react';
import { Share2, Copy, Check, MessageCircle, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { PlayerCardDisplay } from '@/components/sport/PlayerCardDisplay';
import type { PlayerCard } from '@/types/sport';

interface ShareablePlayerCardProps {
  card: PlayerCard;
  studentName: string;
}

export function ShareablePlayerCard({ card, studentName }: ShareablePlayerCardProps) {
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/sports/card/${card.studentId}/${card.sportCode}`
      : '';

  const statsSummary = Object.entries(card.keyStats)
    .slice(0, 3)
    .map(([k, v]) => `${k}: ${v}`)
    .join(' | ');

  const shareText = `Check out ${studentName}'s ${card.sportCode} player card! Rating: ${card.overallRating} (${card.tier}) | ${statsSummary}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`;
    window.open(url, '_blank');
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !cardRef.current) return;
    const html = cardRef.current.innerHTML;
    printWindow.document.write(`
      <html><head><title>${studentName} - Player Card</title>
      <style>body{display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;font-family:sans-serif;}</style>
      </head><body>${html}</body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div ref={cardRef}>
        <PlayerCardDisplay card={card} />
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button size="xs" variant="outline" className="gap-1" />}
        >
          <Share2 className="h-3 w-3" />
          Share
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center">
          <DropdownMenuItem onClick={handleCopy}>
            {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
            Copy Link
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleWhatsApp}>
            <MessageCircle className="mr-2 h-4 w-4" />
            WhatsApp
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Download / Print
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
