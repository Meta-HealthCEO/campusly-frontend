'use client';

import { useState } from 'react';
import { Share2, Copy, Check, MessageCircle, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface ShareCampaignButtonProps {
  campaignTitle: string;
  campaignId: string;
}

export function ShareCampaignButton({
  campaignTitle,
  campaignId,
}: ShareCampaignButtonProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/fundraising/${campaignId}`
      : '';

  const shareText = `Support "${campaignTitle}" - every contribution makes a difference!`;

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

  const handleEmail = () => {
    const subject = encodeURIComponent(`Support: ${campaignTitle}`);
    const body = encodeURIComponent(`${shareText}\n\n${shareUrl}`);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button size="xs" variant="outline" className="gap-1" />}
      >
        <Share2 className="h-3 w-3" />
        Share
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleCopy}>
          {copied ? (
            <Check className="mr-2 h-4 w-4" />
          ) : (
            <Copy className="mr-2 h-4 w-4" />
          )}
          Copy Link
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleWhatsApp}>
          <MessageCircle className="mr-2 h-4 w-4" />
          WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleEmail}>
          <Mail className="mr-2 h-4 w-4" />
          Email
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
