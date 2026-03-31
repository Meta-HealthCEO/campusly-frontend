'use client';

import { useState } from 'react';
import { useMigrationStore } from '@/stores/useMigrationStore';
import { StepSourceSelect } from './StepSourceSelect';
import { FileUploadZone } from './FileUploadZone';
import { ColumnMapper } from './ColumnMapper';
import { ValidationResultsStep } from './ValidationResults';
import { DataPreviewTable } from './DataPreviewTable';
import { ImportExecute } from './ImportExecute';
import type { SourceSystem, WizardStep } from '@/types/migration';

const STEP_LABELS: Record<WizardStep, string> = {
  1: 'Select Source',
  2: 'Upload File',
  3: 'Map Columns',
  4: 'Validate',
  5: 'Preview',
  6: 'Import',
};

export function MigrationWizard() {
  const { activeJob, wizardStep, setWizardStep, resetWizard } = useMigrationStore();
  const [sourceSystem, setSourceSystem] = useState<SourceSystem | null>(null);

  const handleSourceSelect = (system: SourceSystem) => {
    setSourceSystem(system);
    setWizardStep(2);
  };

  const renderStepIndicator = () => (
    <div className="mb-6 flex items-center justify-center gap-1">
      {([1, 2, 3, 4, 5, 6] as WizardStep[]).map((step) => (
        <div key={step} className="flex items-center">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors ${
              step === wizardStep
                ? 'bg-primary text-primary-foreground'
                : step < wizardStep
                  ? 'bg-primary/20 text-primary'
                  : 'bg-muted text-muted-foreground'
            }`}
          >
            {step}
          </div>
          <span
            className={`ml-1 hidden text-xs sm:inline ${
              step === wizardStep ? 'font-medium text-foreground' : 'text-muted-foreground'
            }`}
          >
            {STEP_LABELS[step]}
          </span>
          {step < 6 && (
            <div
              className={`mx-2 h-px w-6 ${
                step < wizardStep ? 'bg-primary/40' : 'bg-border'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  const renderStep = () => {
    switch (wizardStep) {
      case 1:
        return <StepSourceSelect onSelect={handleSourceSelect} />;
      case 2:
        return sourceSystem ? (
          <FileUploadZone sourceSystem={sourceSystem} onBack={() => setWizardStep(1)} />
        ) : null;
      case 3:
        return activeJob ? (
          <ColumnMapper
            sourceSystem={activeJob.sourceSystem}
            initialMapping={activeJob.mapping}
            jobId={activeJob.id}
            onBack={() => setWizardStep(2)}
            onSaved={() => setWizardStep(4)}
          />
        ) : null;
      case 4:
        return activeJob ? (
          <ValidationResultsStep
            jobId={activeJob.id}
            onBack={() => setWizardStep(3)}
          />
        ) : null;
      case 5:
        return activeJob ? (
          <DataPreviewTable
            jobId={activeJob.id}
            onBack={() => setWizardStep(4)}
            onContinue={() => setWizardStep(6)}
          />
        ) : null;
      case 6:
        return activeJob ? (
          <ImportExecute
            jobId={activeJob.id}
            onBack={() => setWizardStep(5)}
            onNewImport={resetWizard}
          />
        ) : null;
      default:
        return null;
    }
  };

  return (
    <div>
      {renderStepIndicator()}
      {renderStep()}
    </div>
  );
}
