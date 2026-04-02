'use client';

import { toast } from 'sonner';
import { SchoolProfileCard } from './SchoolProfileCard';
import { SchoolSettingsForm } from './SchoolSettingsForm';
import { useSchoolData } from '@/hooks/useSchoolData';
import type { SchoolDocument, UpdateSettingsInput } from '@/types';

interface SchoolGeneralTabProps {
  school: SchoolDocument;
}

export function SchoolGeneralTab({ school }: SchoolGeneralTabProps) {
  const { updateSettings } = useSchoolData();

  const handleSave = async (data: UpdateSettingsInput) => {
    try {
      await updateSettings(school.id, data);
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save settings');
      throw new Error('Failed to save settings');
    }
  };

  return (
    <div className="space-y-4">
      <SchoolProfileCard school={school} />
      <SchoolSettingsForm school={school} onSave={handleSave} />
    </div>
  );
}
