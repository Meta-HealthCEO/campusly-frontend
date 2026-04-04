'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/shared/PageHeader';
import { ArrowLeft, School, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useJoinSchool } from '@/hooks/useJoinSchool';

const joinSchoolSchema = z.object({
  joinCode: z
    .string()
    .length(6, 'Join code must be exactly 6 characters')
    .regex(/^[A-Z0-9]+$/i, 'Join code must be alphanumeric'),
});

type JoinSchoolForm = z.infer<typeof joinSchoolSchema>;

export default function JoinSchoolPage() {
  const router = useRouter();
  const { joinSchool, isLoading } = useJoinSchool();
  const [confirmed, setConfirmed] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<JoinSchoolForm>({
    resolver: zodResolver(joinSchoolSchema),
  });

  const codeValue = watch('joinCode') ?? '';

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const upper = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setValue('joinCode', upper, { shouldValidate: true });
  };

  const onSubmit = async (data: JoinSchoolForm) => {
    try {
      await joinSchool(data.joinCode.toUpperCase());
    } catch {
      // Error toast already shown by hook
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-6">
        <Link
          href="/teacher"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>

      <PageHeader
        title="Join a School"
        description="If your school is on Campusly, enter the join code provided by your school administrator."
      />

      <Card className="mt-6">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <School className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Enter Join Code</CardTitle>
          </div>
          <CardDescription>
            Your school administrator can find the 6-character code in their admin settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="joinCode">
                Join Code <span className="text-destructive">*</span>
              </Label>
              <Input
                id="joinCode"
                {...register('joinCode')}
                value={codeValue}
                onChange={handleCodeChange}
                placeholder="ABC123"
                maxLength={6}
                className="font-mono text-xl tracking-[0.3em] uppercase w-full text-center h-14"
                autoComplete="off"
                autoCapitalize="characters"
              />
              {errors.joinCode && (
                <p className="text-xs text-destructive">{errors.joinCode.message}</p>
              )}
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-4">
              <div className="flex gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Before you join
                  </p>
                  <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-0.5 list-disc list-inside">
                    <li>Your account will be linked to the school.</li>
                    <li>Your lessons, questions, and papers will be migrated.</li>
                    <li>Your current standalone school will be archived.</li>
                    <li>This action cannot be easily undone.</li>
                  </ul>
                  <div className="pt-2 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="confirm"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                      className="h-4 w-4 rounded border-border"
                    />
                    <label htmlFor="confirm" className="text-xs text-amber-700 dark:text-amber-300 cursor-pointer">
                      I understand and want to proceed
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !confirmed || codeValue.length !== 6}
            >
              {isLoading ? 'Joining School...' : 'Join School'}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => router.push('/teacher')}
            >
              Cancel
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
