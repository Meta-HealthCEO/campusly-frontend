'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ObservationScores, FocusArea, UpdateObservationPayload } from '@/types';

interface ObservationFormProps {
  focusAreas: FocusArea[];
  onSubmit: (data: UpdateObservationPayload) => Promise<void>;
  saving: boolean;
}

const FOCUS_AREA_LABELS: Record<FocusArea, string> = {
  lesson_planning: 'Lesson Planning',
  learner_engagement: 'Learner Engagement',
  assessment_practices: 'Assessment Practices',
  classroom_management: 'Classroom Management',
  subject_knowledge: 'Subject Knowledge',
  differentiation: 'Differentiation',
  use_of_resources: 'Use of Resources',
  questioning_techniques: 'Questioning Techniques',
};

export function ObservationForm({ focusAreas, onSubmit, saving }: ObservationFormProps) {
  const [scores, setScores] = useState<ObservationScores>({});
  const [notes, setNotes] = useState('');
  const [recommendations, setRecommendations] = useState('');

  const handleScoreChange = (area: FocusArea, value: number) => {
    setScores((prev) => ({ ...prev, [area]: value }));
  };

  const handleSubmit = async () => {
    await onSubmit({
      status: 'completed',
      scores,
      notes,
      recommendations,
      completedAt: new Date().toISOString(),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Complete Observation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <Label className="text-sm font-medium">Scores (1-5)</Label>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
            {focusAreas.map((area) => (
              <div key={area} className="flex items-center gap-2">
                <Label className="text-sm min-w-[140px] truncate">
                  {FOCUS_AREA_LABELS[area]}
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  className="w-full sm:w-20"
                  value={scores[area] ?? ''}
                  onChange={(e) => handleScoreChange(area, Number(e.target.value))}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="obs-notes">Notes</Label>
          <Textarea
            id="obs-notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observation notes..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="obs-recs">Recommendations</Label>
          <Textarea
            id="obs-recs"
            rows={3}
            value={recommendations}
            onChange={(e) => setRecommendations(e.target.value)}
            placeholder="Recommendations for the teacher..."
          />
        </div>

        <Button onClick={handleSubmit} disabled={saving} className="w-full sm:w-auto">
          {saving ? 'Saving...' : 'Complete Observation'}
        </Button>
      </CardContent>
    </Card>
  );
}
