'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAccountingConfig, useAccountingExports, useIncomeStatement, useCashFlow } from '@/hooks/useAccounting';
import { AccountingConfigForm } from '@/components/accounting/AccountingConfigForm';
import { ExportDialog } from '@/components/accounting/ExportDialog';
import { ExportHistoryTable } from '@/components/accounting/ExportHistoryTable';
import { IncomeStatementView } from '@/components/accounting/IncomeStatementView';
import { CashFlowChart } from '@/components/accounting/CashFlowChart';

function toLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function AccountingPage() {
  const { config, loading: configLoading, saveConfig } = useAccountingConfig();
  const { exports, loading: exportsLoading, generateExport, downloadExport } = useAccountingExports();

  const [reportFrom, setReportFrom] = useState(
    toLocalDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
  );
  const [reportTo, setReportTo] = useState(toLocalDate(new Date()));

  const { statement, loading: statementLoading } = useIncomeStatement(reportFrom, reportTo);
  const { cashFlow, loading: cashFlowLoading } = useCashFlow(reportFrom, reportTo);

  if (configLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounting & Exports"
        description="Configure accounting integration and export financial data"
      />

      <Tabs defaultValue="exports">
        <TabsList className="flex-wrap">
          <TabsTrigger value="exports">Exports</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="exports">
          <div className="space-y-4">
            <div className="flex justify-end">
              <ExportDialog onGenerate={generateExport} />
            </div>
            <ExportHistoryTable exports={exports} loading={exportsLoading} onDownload={downloadExport} />
          </div>
        </TabsContent>

        <TabsContent value="reports">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="space-y-1 w-full sm:w-auto">
                <Label>From</Label>
                <Input type="date" value={reportFrom} onChange={(e) => setReportFrom(e.target.value)} className="w-full sm:w-44" />
              </div>
              <div className="space-y-1 w-full sm:w-auto">
                <Label>To</Label>
                <Input type="date" value={reportTo} onChange={(e) => setReportTo(e.target.value)} className="w-full sm:w-44" />
              </div>
            </div>
            <IncomeStatementView statement={statement} loading={statementLoading} />
            <CashFlowChart cashFlow={cashFlow} loading={cashFlowLoading} />
          </div>
        </TabsContent>

        <TabsContent value="config">
          <AccountingConfigForm config={config} onSave={saveConfig} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
