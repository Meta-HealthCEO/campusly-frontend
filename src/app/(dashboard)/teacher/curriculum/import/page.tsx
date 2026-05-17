'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, ScanLine } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CurriculumTreeBrowser } from '@/components/curriculum/CurriculumTreeBrowser';
import { NodePicker } from '@/components/curriculum/NodePicker';
import { PageHeader } from '@/components/shared/PageHeader';
import { WizardFooter } from '@/components/shared/WizardFooter';
import { UploadDropzone } from '@/components/paper-import/UploadDropzone';
import { OptionsForm } from '@/components/paper-import/OptionsForm';
import { useCurriculumStructure } from '@/hooks/useCurriculumStructure';
import { useCurriculumPreparation } from '@/hooks/useCurriculumPreparation';
import { usePaperImport } from '@/hooks/usePaperImport';
import { cn } from '@/lib/utils';
import { extractErrorMessage } from '@/lib/api-helpers';
import type { CurriculumNodeItem, PaperImportJobOptions } from '@/types';

const STEPS = [
  { number: 1, label: 'Curriculum' },
  { number: 2, label: 'Upload' },
  { number: 3, label: 'Options' },
  { number: 4, label: 'Convert' },
];

const DEFAULT_OPTIONS: PaperImportJobOptions = {
  generateAnswers: true,
  addHints: true,
  addWorkedExample: true,
  addExplanations: true,
  instructions: '',
};

export default function ImportPaperPage() {
  const router = useRouter();
  const { selectedFramework, searchNodes, loadNode } = useCurriculumStructure();
  const prep = useCurriculumPreparation();
  const { createJob } = usePaperImport();

  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [options, setOptions] = useState<PaperImportJobOptions>(DEFAULT_OPTIONS);
  const [submitting, setSubmitting] = useState(false);

  const canContinueFromCurriculum = prep.isReady;
  const canContinueFromUpload = !!file;

  async function handleSubmit() {
    if (!file || !prep.isReady) return;
    setSubmitting(true);
    try {
      const job = await createJob({
        subjectId: prep.subjectId,
        gradeId: prep.gradeId,
        term: prep.term,
        curriculumNodeId: prep.selectedNode?.id ?? '',
        generateAnswers: options.generateAnswers,
        addHints: options.addHints,
        addWorkedExample: options.addWorkedExample,
        addExplanations: options.addExplanations,
        instructions: options.instructions,
        file,
      });
      router.push(`/teacher/curriculum/import/${job.id}`);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to start import'));
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        title="Convert Existing Paper"
        description="Upload a PDF or image of an existing worksheet, study notes, or paper and turn it into an editable digital paper."
      >
        <Link href="/teacher/curriculum/import/jobs" className={cn(buttonVariants({ variant: 'outline' }))}>
          Converted papers
        </Link>
      </PageHeader>

      <nav aria-label="Import progress">
        <ol className="flex items-center justify-between gap-2">
          {STEPS.map((s, idx) => {
            const complete = step > s.number;
            const current = step === s.number;
            return (
              <li key={s.number} className="flex flex-1 items-center gap-2">
                <span
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold',
                    complete && 'bg-primary text-primary-foreground',
                    current && 'bg-primary text-primary-foreground ring-4 ring-primary/20',
                    !complete && !current && 'bg-muted text-muted-foreground',
                  )}
                >
                  {complete ? <Check className="h-4 w-4" /> : s.number}
                </span>
                <span
                  className={cn(
                    'hidden text-xs font-medium sm:inline',
                    current ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {s.label}
                </span>
                {idx < STEPS.length - 1 && (
                  <div
                    className={cn(
                      'hidden h-0.5 flex-1 rounded-full sm:block',
                      complete ? 'bg-primary' : 'bg-muted',
                    )}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="mx-auto max-w-3xl space-y-4">
        {step === 1 && (
          <Card>
            <CardContent className="space-y-3 p-4">
              <Tabs defaultValue="browse">
                <TabsList>
                  <TabsTrigger value="browse">Browse</TabsTrigger>
                  <TabsTrigger value="search">Search</TabsTrigger>
                </TabsList>
                <TabsContent value="browse" className="mt-3">
                  <div className="max-h-[60vh] overflow-y-auto rounded-md border p-1">
                    <CurriculumTreeBrowser
                      frameworkId={selectedFramework}
                      selectedNodeId={prep.selectedNode?.id ?? null}
                      onSelect={(node: CurriculumNodeItem) => prep.apply(node)}
                    />
                  </div>
                </TabsContent>
                <TabsContent value="search" className="mt-3">
                  <NodePicker
                    frameworkId={selectedFramework}
                    value={prep.selectedNode?.id ?? null}
                    onChange={(_id, node) => { if (node) prep.apply(node); }}
                    onSearch={searchNodes}
                    onLoadNode={loadNode}
                    placeholder="Search for a CAPS topic..."
                  />
                </TabsContent>
              </Tabs>
              {prep.contextStatus === 'ready' && prep.curriculumContext && (
                <Badge variant="outline" className="gap-1">
                  <Check className="h-3 w-3 text-emerald-500" />
                  {prep.curriculumContext.subjectName} · {prep.curriculumContext.gradeName} · Term {prep.term}
                </Badge>
              )}
              {prep.contextStatus === 'error' && prep.contextError && (
                <p className="text-sm text-destructive">{prep.contextError}</p>
              )}
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardContent className="p-4">
              <UploadDropzone
                value={file}
                pageCount={pageCount}
                onChange={(f, p) => { setFile(f); setPageCount(p); }}
              />
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardContent className="p-4">
              <OptionsForm value={options} onChange={setOptions} />
            </CardContent>
          </Card>
        )}

        {step === 4 && (
          <Card>
            <CardContent className="space-y-4 p-4">
              <div>
                <h3 className="font-semibold">Ready to convert</h3>
                <p className="text-sm text-muted-foreground">
                  {prep.curriculumContext?.subjectName} · {prep.curriculumContext?.gradeName} · Term {prep.term}
                </p>
              </div>
              <div className="rounded-md border p-3 text-sm">
                <p className="font-medium truncate">{file?.name}</p>
                <p className="text-xs text-muted-foreground">
                  {pageCount ?? 1} page{(pageCount ?? 1) === 1 ? '' : 's'}
                </p>
              </div>
              <div className="rounded-md border p-3 text-sm">
                <p className="font-medium">Enhancements</p>
                <ul className="mt-1 text-xs text-muted-foreground">
                  {options.generateAnswers && <li>· Generate missing answers</li>}
                  {options.addHints && <li>· Add hints</li>}
                  {options.addWorkedExample && <li>· Add worked example</li>}
                  {options.addExplanations && <li>· Add explanations</li>}
                </ul>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <WizardFooter
        step={step}
        totalSteps={STEPS.length}
        onBack={step > 1 ? () => setStep(Math.max(1, step - 1)) : undefined}
        onNext={
          step < 4
            ? () => setStep(step + 1)
            : () => void handleSubmit()
        }
        nextLabel={
          step < 4
            ? 'Next'
            : submitting ? 'Starting…' : 'Start Conversion'
        }
        nextIcon={step === 4 && !submitting ? <ScanLine className="ml-2 h-4 w-4" /> : undefined}
        nextLoading={step === 4 ? submitting : false}
        nextDisabled={
          (step === 1 && !canContinueFromCurriculum) ||
          (step === 2 && !canContinueFromUpload) ||
          (step === 4 && submitting)
        }
        isFinal={step === 4}
      />
    </div>
  );
}
