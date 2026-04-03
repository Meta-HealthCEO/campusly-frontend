'use client';

import { useState, useEffect } from 'react';
import type { TaxTable, TaxBracket } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Save } from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const centsToRands = (cents: number) => (cents / 100).toFixed(2);
const randsToCents = (val: string) => Math.round(parseFloat(val || '0') * 100);
const pctToDecimal = (val: string) => parseFloat(val || '0') / 100;
const decimalToPct = (d: number) => (d * 100).toFixed(4);

// ─── Row state types ──────────────────────────────────────────────────────────

interface BracketRow {
  from: string;
  to: string;
  rate: string;
  baseAmount: string;
}

function bracketToRow(b: TaxBracket): BracketRow {
  return {
    from: centsToRands(b.from),
    to: b.to === null ? '' : centsToRands(b.to),
    rate: decimalToPct(b.rate),
    baseAmount: centsToRands(b.baseAmount),
  };
}

function rowToBracket(r: BracketRow): TaxBracket {
  return {
    from: randsToCents(r.from),
    to: r.to === '' ? null : randsToCents(r.to),
    rate: pctToDecimal(r.rate),
    baseAmount: randsToCents(r.baseAmount),
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  step?: string;
  placeholder?: string;
}

function Field({ label, value, onChange, type = 'number', step = '0.01', placeholder }: FieldProps) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type={type}
        step={step}
        min="0"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 text-sm"
      />
    </div>
  );
}

interface SectionHeadingProps { title: string }
function SectionHeading({ title }: SectionHeadingProps) {
  return <h3 className="text-sm font-semibold border-b pb-1 mb-3">{title}</h3>;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface TaxBracketEditorProps {
  taxTable: TaxTable | null;
  onSave: (data: Omit<TaxTable, 'id' | 'schoolId'>) => Promise<void>;
}

// ─── Default blank state ──────────────────────────────────────────────────────

const defaultState = {
  taxYear: new Date().getFullYear() + 1,
  brackets: [] as BracketRow[],
  primaryRebate: '17235.00',
  secondaryRebate: '9444.00',
  tertiaryRebate: '3145.00',
  threshold65: '95750.00',
  threshold65to74: '148217.00',
  threshold75: '165689.00',
  uifRate: '1.0000',
  uifCeiling: '17712.00',
  sdlRate: '1.0000',
  medMain: '364.00',
  medFirst: '364.00',
  medAdditional: '246.00',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function TaxBracketEditor({ taxTable, onSave }: TaxBracketEditorProps) {
  const [taxYear, setTaxYear] = useState(defaultState.taxYear);
  const [brackets, setBrackets] = useState<BracketRow[]>(defaultState.brackets);
  const [primaryRebate, setPrimaryRebate] = useState(defaultState.primaryRebate);
  const [secondaryRebate, setSecondaryRebate] = useState(defaultState.secondaryRebate);
  const [tertiaryRebate, setTertiaryRebate] = useState(defaultState.tertiaryRebate);
  const [threshold65, setThreshold65] = useState(defaultState.threshold65);
  const [threshold65to74, setThreshold65to74] = useState(defaultState.threshold65to74);
  const [threshold75, setThreshold75] = useState(defaultState.threshold75);
  const [uifRate, setUifRate] = useState(defaultState.uifRate);
  const [uifCeiling, setUifCeiling] = useState(defaultState.uifCeiling);
  const [sdlRate, setSdlRate] = useState(defaultState.sdlRate);
  const [medMain, setMedMain] = useState(defaultState.medMain);
  const [medFirst, setMedFirst] = useState(defaultState.medFirst);
  const [medAdditional, setMedAdditional] = useState(defaultState.medAdditional);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!taxTable) return;
    setTaxYear(taxTable.taxYear);
    setBrackets(taxTable.brackets.map(bracketToRow));
    setPrimaryRebate(centsToRands(taxTable.rebates.primary));
    setSecondaryRebate(centsToRands(taxTable.rebates.secondary));
    setTertiaryRebate(centsToRands(taxTable.rebates.tertiary));
    setThreshold65(centsToRands(taxTable.taxThresholds.under65));
    setThreshold65to74(centsToRands(taxTable.taxThresholds.age65to74));
    setThreshold75(centsToRands(taxTable.taxThresholds.age75plus));
    setUifRate(decimalToPct(taxTable.uifRate));
    setUifCeiling(centsToRands(taxTable.uifCeiling));
    setSdlRate(decimalToPct(taxTable.sdlRate));
    setMedMain(centsToRands(taxTable.medicalCredits.main));
    setMedFirst(centsToRands(taxTable.medicalCredits.firstDependant));
    setMedAdditional(centsToRands(taxTable.medicalCredits.additionalDependant));
  }, [taxTable]);

  const addBracket = () =>
    setBrackets((prev) => [...prev, { from: '0', to: '', rate: '18.0000', baseAmount: '0' }]);

  const removeBracket = (i: number) =>
    setBrackets((prev) => prev.filter((_, idx) => idx !== i));

  const updateBracket = (i: number, field: keyof BracketRow, value: string) =>
    setBrackets((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        taxYear,
        brackets: brackets.map(rowToBracket),
        rebates: {
          primary: randsToCents(primaryRebate),
          secondary: randsToCents(secondaryRebate),
          tertiary: randsToCents(tertiaryRebate),
        },
        taxThresholds: {
          under65: randsToCents(threshold65),
          age65to74: randsToCents(threshold65to74),
          age75plus: randsToCents(threshold75),
        },
        uifRate: pctToDecimal(uifRate),
        uifCeiling: randsToCents(uifCeiling),
        sdlRate: pctToDecimal(sdlRate),
        medicalCredits: {
          main: randsToCents(medMain),
          firstDependant: randsToCents(medFirst),
          additionalDependant: randsToCents(medAdditional),
        },
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tax Year */}
      <div className="flex items-center gap-4">
        <div className="w-40">
          <Field
            label="Tax Year"
            value={String(taxYear)}
            onChange={(v) => setTaxYear(parseInt(v, 10) || taxYear)}
            step="1"
          />
        </div>
      </div>

      {/* Brackets */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <SectionHeading title="Tax Brackets" />
          <Button type="button" variant="outline" size="sm" onClick={addBracket}>
            <Plus className="h-3 w-3 mr-1" /> Add Bracket
          </Button>
        </div>

        {brackets.length === 0 && (
          <p className="text-sm text-muted-foreground">No brackets defined.</p>
        )}

        <div className="space-y-2">
          {/* Header */}
          {brackets.length > 0 && (
            <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 px-1">
              {['From (R)', 'To (R)', 'Rate (%)', 'Base Amt (R)', ''].map((h) => (
                <span key={h} className="text-xs text-muted-foreground font-medium">{h}</span>
              ))}
            </div>
          )}
          {brackets.map((row, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 items-center">
              <Input className="h-8 text-sm" type="number" step="0.01" min="0"
                value={row.from} onChange={(e) => updateBracket(i, 'from', e.target.value)} />
              <Input className="h-8 text-sm" type="number" step="0.01" min="0"
                placeholder="No limit" value={row.to}
                onChange={(e) => updateBracket(i, 'to', e.target.value)} />
              <Input className="h-8 text-sm" type="number" step="0.0001" min="0" max="100"
                value={row.rate} onChange={(e) => updateBracket(i, 'rate', e.target.value)} />
              <Input className="h-8 text-sm" type="number" step="0.01" min="0"
                value={row.baseAmount}
                onChange={(e) => updateBracket(i, 'baseAmount', e.target.value)} />
              <Button type="button" variant="ghost" size="sm" onClick={() => removeBracket(i)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Rebates */}
      <div>
        <SectionHeading title="Rebates (R)" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Primary" value={primaryRebate} onChange={setPrimaryRebate} />
          <Field label="Secondary (65+)" value={secondaryRebate} onChange={setSecondaryRebate} />
          <Field label="Tertiary (75+)" value={tertiaryRebate} onChange={setTertiaryRebate} />
        </div>
      </div>

      {/* Tax Thresholds */}
      <div>
        <SectionHeading title="Tax Thresholds (R)" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Under 65" value={threshold65} onChange={setThreshold65} />
          <Field label="Age 65–74" value={threshold65to74} onChange={setThreshold65to74} />
          <Field label="Age 75+" value={threshold75} onChange={setThreshold75} />
        </div>
      </div>

      {/* UIF & SDL */}
      <div>
        <SectionHeading title="UIF & SDL" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="UIF Rate (%)" value={uifRate} onChange={setUifRate} step="0.0001" />
          <Field label="UIF Ceiling (R)" value={uifCeiling} onChange={setUifCeiling} />
          <Field label="SDL Rate (%)" value={sdlRate} onChange={setSdlRate} step="0.0001" />
        </div>
      </div>

      {/* Medical Credits */}
      <div>
        <SectionHeading title="Medical Tax Credits (R/month)" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Main Member" value={medMain} onChange={setMedMain} />
          <Field label="First Dependant" value={medFirst} onChange={setMedFirst} />
          <Field label="Additional Dependant" value={medAdditional} onChange={setMedAdditional} />
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving…' : 'Save Tax Table'}
        </Button>
      </div>
    </div>
  );
}
