interface EveningStep {
  time: string;
  title: string;
  body: string;
  /** What the screen says at that moment — the product's own vocabulary. */
  receipt: string;
}

const STEPS: EveningStep[] = [
  {
    time: '9:47 PM',
    title: 'Mark the stack',
    body: 'Photograph each script. Campusly reads the handwriting and marks it question by question against your memo. You check, adjust a mark if you disagree, and move on.',
    receipt: 'Script 17 of 50 · Q3.2 method mark awarded · 38/50',
  },
  {
    time: '9:52 PM',
    title: "Set Friday's test",
    body: 'Type what you need and get a full paper with its memo, weighted across the CAPS cognitive levels. Change any question before you print.',
    receipt: '“Grade 10 Term 3 statistics test, 50 marks” → paper + memo',
  },
  {
    time: '9:58 PM',
    title: "Plan tomorrow's lesson",
    body: 'Pick the topic and the lesson is laid out in phases. The lesson assistant already knows the topic and your textbook chapter — ask it for worked examples or common misconceptions.',
    receipt: 'Introduction · Direct instruction · Practice · Homework',
  },
  {
    time: '10:01 PM',
    title: 'Marks where they belong',
    body: 'Scores land in your gradebook with class averages and trends. Orals, practicals and tests you set on paper go in the same place.',
    receipt: 'Grade 10 Maths · class average 72.7% · Term 3',
  },
];

/** One evening of marking and prep, as the timestamps it actually takes. */
export function EveningTimeline() {
  return (
    <section id="evening" aria-labelledby="evening-heading" className="scroll-mt-16 border-t border-white/10 bg-(--midnight)">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <h2 id="evening-heading" className="text-3xl font-semibold tracking-tight sm:text-4xl">
          One evening, four jobs
        </h2>
        <p className="mt-3 max-w-xl text-white/65">
          A weeknight of marking and prep, with Campusly doing the slow parts.
        </p>

        <ol className="mt-14 space-y-12 border-l border-white/10 sm:space-y-16">
          {STEPS.map((step) => (
            <li key={step.time} className="relative grid grid-cols-[minmax(0,1fr)] gap-3 pl-6 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-10 sm:pl-10">
              <span aria-hidden className="absolute -left-[5px] top-2 size-2.5 rounded-full bg-(--violet-soft)" />
              <p className="font-(family-name:--font-clock) text-lg tabular-nums text-(--lavender)">{step.time}</p>
              <div className="min-w-0 max-w-2xl">
                <h3 className="text-xl font-semibold">{step.title}</h3>
                <p className="mt-2 leading-relaxed text-white/70">{step.body}</p>
                <p className="mt-4 w-fit max-w-full truncate rounded-md border border-white/10 bg-white/[0.04] px-3 py-1.5 font-(family-name:--font-clock) text-xs text-white/60">
                  {step.receipt}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <p className="mt-16 font-(family-name:--font-clock) text-3xl font-semibold tabular-nums sm:pl-10 sm:text-4xl">
          10:02 PM. <span className="text-(--tick)">Done.</span>
        </p>
      </div>
    </section>
  );
}
