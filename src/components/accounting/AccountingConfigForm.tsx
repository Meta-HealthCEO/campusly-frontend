'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { extractErrorMessage } from '@/lib/api-helpers';
import type { AccountingConfig, GLMapping, BankMapping, AccountingProvider, VatCode, SyncFrequency } from '@/types';

interface Props {
  config: AccountingConfig | null;
  onSave: (data: Partial<AccountingConfig>) => Promise<AccountingConfig>;
}

const PROVIDERS: { value: AccountingProvider; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'sage_one', label: 'Sage One' },
  { value: 'xero', label: 'Xero' },
  { value: 'quickbooks', label: 'QuickBooks' },
  { value: 'pastel', label: 'Pastel' },
];

const FEE_CATEGORIES = ['tuition', 'extramural', 'camp', 'uniform', 'transport', 'other'];
const PAYMENT_METHODS = ['cash', 'eft', 'debit_order', 'card', 'snapscan', 'wallet'];

export function AccountingConfigForm({ config, onSave }: Props) {
  const [provider, setProvider] = useState<AccountingProvider>(config?.provider ?? 'none');
  const [vatRegistered, setVatRegistered] = useState(config?.vatRegistered ?? false);
  const [vatNumber, setVatNumber] = useState(config?.vatNumber ?? '');
  const [syncFrequency, setSyncFrequency] = useState<SyncFrequency>(config?.syncFrequency ?? 'manual');
  const [glMapping, setGlMapping] = useState<GLMapping[]>(config?.glMapping ?? []);
  const [bankMapping, setBankMapping] = useState<BankMapping[]>(config?.bankMapping ?? []);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config) {
      setProvider(config.provider);
      setVatRegistered(config.vatRegistered);
      setVatNumber(config.vatNumber ?? '');
      setSyncFrequency(config.syncFrequency);
      setGlMapping(config.glMapping);
      setBankMapping(config.bankMapping);
    }
  }, [config]);

  const addGLMapping = () => {
    setGlMapping([...glMapping, { feeCategory: '', accountCode: '', accountName: '', vatCode: 'zero_rated' }]);
  };

  const removeGLMapping = (idx: number) => {
    setGlMapping(glMapping.filter((_: GLMapping, i: number) => i !== idx));
  };

  const updateGL = (idx: number, field: keyof GLMapping, value: string) => {
    const updated = [...glMapping];
    updated[idx] = { ...updated[idx], [field]: value } as GLMapping;
    setGlMapping(updated);
  };

  const addBankMapping = () => {
    setBankMapping([...bankMapping, { paymentMethod: '', bankAccountCode: '', bankAccountName: '' }]);
  };

  const removeBankMapping = (idx: number) => {
    setBankMapping(bankMapping.filter((_: BankMapping, i: number) => i !== idx));
  };

  const updateBank = (idx: number, field: keyof BankMapping, value: string) => {
    const updated = [...bankMapping];
    updated[idx] = { ...updated[idx], [field]: value } as BankMapping;
    setBankMapping(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ provider, vatRegistered, vatNumber: vatNumber || undefined, syncFrequency, glMapping, bankMapping });
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to save configuration'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* General Settings */}
      <Card>
        <CardHeader><CardTitle>General Settings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Accounting Provider</Label>
              <Select value={provider} onValueChange={(val: unknown) => setProvider(val as AccountingProvider)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((p: { value: AccountingProvider; label: string }) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sync Frequency</Label>
              <Select value={syncFrequency} onValueChange={(val: unknown) => setSyncFrequency(val as SyncFrequency)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <input type="checkbox" checked={vatRegistered} onChange={(e) => setVatRegistered(e.target.checked)} className="rounded" />
                VAT Registered
              </Label>
              {vatRegistered && (
                <Input placeholder="VAT Number" value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* GL Mapping */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>GL Account Mapping</CardTitle>
            <Button size="sm" variant="outline" onClick={addGLMapping}><Plus className="h-4 w-4 mr-1" />Add</Button>
          </div>
        </CardHeader>
        <CardContent>
          {glMapping.length === 0 && <p className="text-sm text-muted-foreground">No GL mappings configured.</p>}
          <div className="space-y-3">
            {glMapping.map((gl: GLMapping, idx: number) => (
              <div key={idx} className="grid gap-2 grid-cols-2 sm:grid-cols-5 items-end">
                <Select value={gl.feeCategory || undefined} onValueChange={(val: unknown) => updateGL(idx, 'feeCategory', val as string)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>
                    {FEE_CATEGORIES.map((c: string) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input placeholder="Account Code" value={gl.accountCode} onChange={(e) => updateGL(idx, 'accountCode', e.target.value)} />
                <Input placeholder="Account Name" value={gl.accountName} onChange={(e) => updateGL(idx, 'accountName', e.target.value)} />
                <Select value={gl.vatCode} onValueChange={(val: unknown) => updateGL(idx, 'vatCode', val as string)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard (15%)</SelectItem>
                    <SelectItem value="zero_rated">Zero Rated</SelectItem>
                    <SelectItem value="exempt">Exempt</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" variant="ghost" onClick={() => removeGLMapping(idx)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bank Mapping */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Bank Account Mapping</CardTitle>
            <Button size="sm" variant="outline" onClick={addBankMapping}><Plus className="h-4 w-4 mr-1" />Add</Button>
          </div>
        </CardHeader>
        <CardContent>
          {bankMapping.length === 0 && <p className="text-sm text-muted-foreground">No bank mappings configured.</p>}
          <div className="space-y-3">
            {bankMapping.map((bm: BankMapping, idx: number) => (
              <div key={idx} className="grid gap-2 grid-cols-2 sm:grid-cols-4 items-end">
                <Select value={bm.paymentMethod || undefined} onValueChange={(val: unknown) => updateBank(idx, 'paymentMethod', val as string)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Method" /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m: string) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input placeholder="Bank Account Code" value={bm.bankAccountCode} onChange={(e) => updateBank(idx, 'bankAccountCode', e.target.value)} />
                <Input placeholder="Bank Account Name" value={bm.bankAccountName} onChange={(e) => updateBank(idx, 'bankAccountName', e.target.value)} />
                <Button size="sm" variant="ghost" onClick={() => removeBankMapping(idx)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Configuration'}</Button>
      </div>
    </div>
  );
}
