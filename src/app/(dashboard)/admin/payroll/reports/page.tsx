'use client';

import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { usePayrollReports } from '@/hooks/usePayrollReports';
import { CostToCompanyChart, CostToCompanyTable } from '@/components/payroll';
import { formatCurrency } from '@/lib/utils';
import type { TaxCertificate } from '@/types';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function PayrollReportsPage() {
  const { costToCompany, loading, fetchCostToCompany, generateTaxCertificates } = usePayrollReports();
  const [activeTab, setActiveTab] = useState('ctc');
  const [ctcMonth, setCtcMonth] = useState(String(new Date().getMonth() + 1));
  const [ctcYear, setCtcYear] = useState(String(new Date().getFullYear()));
  const [certYear, setCertYear] = useState(String(new Date().getFullYear()));
  const [certType, setCertType] = useState<'IRP5' | 'IT3a'>('IRP5');
  const [generating, setGenerating] = useState(false);
  const [certificates, setCertificates] = useState<TaxCertificate[]>([]);

  useEffect(() => {
    if (activeTab === 'ctc') {
      fetchCostToCompany(Number(ctcMonth), Number(ctcYear));
    }
  }, [activeTab, ctcMonth, ctcYear, fetchCostToCompany]);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      const result = await generateTaxCertificates(Number(certYear), certType);
      const data = result as { certificates?: TaxCertificate[]; generated?: number };
      setCertificates(data.certificates ?? []);
      toast.success(`Generated ${data.generated ?? 0} certificates`);
    } catch (err: unknown) {
      console.error('Failed to generate certificates', err);
      toast.error('Failed to generate certificates');
    } finally {
      setGenerating(false);
    }
  }, [certYear, certType, generateTaxCertificates]);

  return (
    <div className="space-y-6">
      <PageHeader title="Payroll Reports" description="Cost-to-company analysis and tax certificates" />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="ctc">Cost to Company</TabsTrigger>
          <TabsTrigger value="certificates">Tax Certificates</TabsTrigger>
        </TabsList>

        <TabsContent value="ctc" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={ctcMonth} onValueChange={(v: unknown) => setCtcMonth(v as string)}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => (
                  <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={ctcYear} onValueChange={(v: unknown) => setCtcYear(v as string)}>
              <SelectTrigger className="w-full sm:w-28">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026, 2027].map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {loading ? <LoadingSpinner /> : (
            <>
              <CostToCompanyChart report={costToCompany} />
              <CostToCompanyTable report={costToCompany} />
            </>
          )}
        </TabsContent>

        <TabsContent value="certificates" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-sm">Tax Year</Label>
              <Select value={certYear} onValueChange={(v: unknown) => setCertYear(v as string)}>
                <SelectTrigger className="w-full sm:w-28">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {[2025, 2026, 2027].map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Type</Label>
              <Select value={certType} onValueChange={(v: unknown) => setCertType(v as 'IRP5' | 'IT3a')}>
                <SelectTrigger className="w-full sm:w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IRP5">IRP5</SelectItem>
                  <SelectItem value="IT3a">IT3a</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? 'Generating...' : 'Generate Certificates'}
            </Button>
          </div>

          {certificates.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 pr-4">Staff</th>
                    <th className="py-2 pr-4">Certificate #</th>
                    <th className="py-2 pr-4 text-right">Total Income</th>
                    <th className="py-2 pr-4 text-right">PAYE</th>
                    <th className="py-2 text-right">UIF</th>
                  </tr>
                </thead>
                <tbody>
                  {certificates.map((c) => {
                    const name = typeof c.staffId === 'object'
                      ? `${c.staffId.firstName} ${c.staffId.lastName}`
                      : String(c.staffId);
                    return (
                      <tr key={c.id} className="border-b">
                        <td className="py-2 pr-4 truncate">{name}</td>
                        <td className="py-2 pr-4">{c.certificateNumber}</td>
                        <td className="py-2 pr-4 text-right">{formatCurrency(c.totalIncome)}</td>
                        <td className="py-2 pr-4 text-right">{formatCurrency(c.totalPAYE)}</td>
                        <td className="py-2 text-right">{formatCurrency(c.totalUIF)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
