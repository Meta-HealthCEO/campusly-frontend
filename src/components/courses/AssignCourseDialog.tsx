'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Users } from 'lucide-react';
import { useTeacherClasses } from '@/hooks/useTeacherClasses';
import { useCourseAssign } from '@/hooks/useCourseAssign';

interface AssignCourseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  courseTitle: string;
}

/**
 * Dialog for assigning a published course to one of the teacher's
 * classes. Bulk-enrols every student in that class. Backend is
 * idempotent so re-assigning the same class won't create duplicates.
 */
export function AssignCourseDialog({
  open,
  onOpenChange,
  courseId,
  courseTitle,
}: AssignCourseDialogProps) {
  const { classes, loading: classesLoading } = useTeacherClasses();
  const { assignToClass } = useCourseAssign();
  const [selectedClassId, setSelectedClassId] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Reset selection when dialog closes so next open starts fresh.
  useEffect(() => {
    if (!open) {
      setSelectedClassId('');
      setAssigning(false);
    }
  }, [open]);

  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const studentCount = selectedClass?.studentCount ?? 0;

  const handleAssign = async () => {
    if (!selectedClassId) return;
    setAssigning(true);
    const result = await assignToClass(courseId, selectedClassId);
    setAssigning(false);
    if (result) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Course to Class</DialogTitle>
          <DialogDescription>
            Bulk-enrol every student in a class into{' '}
            <span className="font-medium">{courseTitle}</span>. Students
            already enroled will not be duplicated.
          </DialogDescription>
        </DialogHeader>

        {classesLoading ? (
          <LoadingSpinner />
        ) : classes.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            You don&apos;t have any classes assigned to you yet.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="class-select">Class</Label>
              <Select
                value={selectedClassId}
                onValueChange={(val: unknown) =>
                  setSelectedClassId(val as string)
                }
              >
                <SelectTrigger id="class-select" className="w-full">
                  <SelectValue placeholder="Pick a class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedClassId && (
              <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-3 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>
                  {studentCount} student{studentCount === 1 ? '' : 's'}{' '}
                  will be enroled in this course.
                </span>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={assigning}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleAssign}
            disabled={!selectedClassId || assigning || classesLoading}
          >
            {assigning ? 'Assigning...' : 'Assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
