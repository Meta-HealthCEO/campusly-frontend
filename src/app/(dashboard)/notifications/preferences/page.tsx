'use client';

import { PageHeader } from '@/components/shared/PageHeader';
import { NotificationPreferencesForm } from '@/components/notifications/NotificationPreferencesForm';

export default function NotificationPreferencesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Notification Preferences"
        description="Choose how you want to receive notifications."
      />
      <div className="max-w-2xl">
        <NotificationPreferencesForm />
      </div>
    </div>
  );
}
