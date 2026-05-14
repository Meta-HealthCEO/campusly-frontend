'use client';

import { use, useEffect, useState } from 'react';
import { readSlip, type StudentSlipData } from '@/lib/student-slip-storage';
import { Button } from '@/components/ui/button';

export default function StudentCredentialsPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [slip, setSlip] = useState<StudentSlipData | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setSlip(readSlip(id));
    setLoaded(true);
  }, [id]);

  useEffect(() => {
    if (loaded && slip) {
      // Auto-trigger the print dialog once the slip is loaded.
      window.print();
    }
  }, [loaded, slip]);

  if (!loaded) return null;

  if (!slip) {
    return (
      <main className="max-w-md mx-auto mt-12 p-6 text-center">
        <h1 className="text-lg font-semibold">Slip expired</h1>
        <p className="text-sm text-muted-foreground mt-2">
          The credentials slip has expired or this page was opened directly.
          Go back to the class roster and use &ldquo;Regenerate credentials&rdquo; to create a new slip.
        </p>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto p-8 print:p-0">
      <div className="border rounded-lg p-8 print:border-0 print:p-0 space-y-6">
        <header className="text-center border-b pb-4">
          <h1 className="text-xl font-bold">{slip.schoolName}</h1>
          <p className="text-sm text-muted-foreground mt-1">Student Portal Login</p>
        </header>

        <section className="space-y-3 text-sm">
          <div>
            <span className="text-muted-foreground">Student:</span>{' '}
            <span className="font-medium">{slip.studentName}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Login URL:</span>{' '}
            <span className="font-mono break-all">{slip.loginUrl}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Login:</span>{' '}
            <span className="font-mono break-all">{slip.loginEmail}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Temporary password:</span>{' '}
            <span className="font-mono">{slip.tempPassword}</span>
          </div>
        </section>

        <section className="rounded-md bg-muted/50 p-3 text-xs">
          <strong>Important:</strong> You will be required to change this password
          on your first login. Keep this slip safe until then.
        </section>

        <footer className="flex justify-end gap-2 print:hidden">
          <Button variant="outline" onClick={() => window.close()}>Close</Button>
          <Button onClick={() => window.print()}>Print again</Button>
        </footer>
      </div>
    </main>
  );
}
