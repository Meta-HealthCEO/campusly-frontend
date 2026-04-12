import Link from 'next/link';

/**
 * Standalone layout for the public certificate verification page. This
 * is the ONE surface in the app that MUST work without authentication —
 * anyone holding a verification code can load it to confirm a
 * certificate is real. No sidebar, no auth guard, no dashboard chrome.
 */
export default function VerifyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <header className="border-b bg-background">
        <div className="mx-auto max-w-4xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold tracking-tight">
            Campusly
          </Link>
          <p className="text-xs text-muted-foreground">Certificate Verification</p>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-2xl px-6 py-12">
        {children}
      </main>
      <footer className="border-t bg-background">
        <div className="mx-auto max-w-4xl px-6 py-4 text-center text-xs text-muted-foreground">
          © Campusly. All certificates issued through Campusly can be verified here.
        </div>
      </footer>
    </div>
  );
}
