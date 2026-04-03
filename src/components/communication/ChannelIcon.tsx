'use client';

import { Mail, MessageSquare, Smartphone, Bell } from 'lucide-react';
import type { CommunicationChannel } from '@/types';

const iconMap: Record<CommunicationChannel, typeof Mail> = {
  email: Mail,
  sms: MessageSquare,
  whatsapp: Smartphone,
  push: Bell,
};

const labelMap: Record<CommunicationChannel, string> = {
  email: 'Email',
  sms: 'SMS',
  whatsapp: 'WhatsApp',
  push: 'Push',
};

interface ChannelIconProps {
  channel: CommunicationChannel;
  className?: string;
  showLabel?: boolean;
}

export function ChannelIcon({ channel, className = 'h-4 w-4', showLabel = false }: ChannelIconProps) {
  const Icon = iconMap[channel] ?? Mail;
  const label = labelMap[channel] ?? channel;

  if (showLabel) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <Icon className={className} />
        <span>{label}</span>
      </span>
    );
  }

  return <Icon className={className} aria-label={label} />;
}
