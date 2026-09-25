import type { ResourceType } from '@/types';

/** What each kind of content resource is called (shared by the content tools and learner homework). */
export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  lesson: 'Lesson',
  study_notes: 'Study Notes',
  worksheet: 'Worksheet',
  worked_example: 'Worked Example',
  activity: 'Activity',
  reading: 'Reading',
};
