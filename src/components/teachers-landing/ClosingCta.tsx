import Link from 'next/link';
import { StartFreeLink } from './StartFreeLink';

/** Back to night: the closing line answers the hero's clock. */
export function ClosingCta() {
  return (
    <>
      <section aria-labelledby="closing-heading" className="bg-(--ink)">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <h2 id="closing-heading" className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Tonight could end at <span className="font-(family-name:--font-clock) tabular-nums text-(--tick)">9:48</span>.
          </h2>
          <p className="mt-5 max-w-xl text-white/65">
            Setting up takes a couple of minutes: choose your grades and subjects, add your class, and
            make your first paper.
          </p>
          <StartFreeLink className="mt-8 w-full sm:w-auto" />
        </div>
      </section>
      <footer className="border-t border-white/10 bg-(--ink)">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-white/50 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} Campusly</p>
          <nav aria-label="Footer" className="flex gap-5">
            <Link href="/" className="hover:text-white">For schools</Link>
            <Link href="/login" className="hover:text-white">Sign in</Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
