'use client';

import { Bus, UserPlus, LogIn, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useTransport } from '@/hooks/useTransport';
import { TransportStatCards } from '@/components/transport/TransportStatCards';
import { RoutesTab } from '@/components/transport/RoutesTab';
import { AssignmentsTab } from '@/components/transport/AssignmentsTab';
import { BoardingLogsTab } from '@/components/transport/BoardingLogsTab';
import { AlertsTab } from '@/components/transport/AlertsTab';

export default function AdminTransportPage() {
  const {
    routes, assignments, boardingLogs, alerts, loading,
    createRoute, updateRoute, deleteRoute,
    fetchAssignments, createAssignment, updateAssignment, deleteAssignment,
    fetchBoardingLogs, createBoardingLog, logAlight,
    fetchAlerts, createAlert, resolveAlert, deleteAlert,
  } = useTransport();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transport"
        description="Manage school transport routes, assignments, boarding, and alerts."
      />

      <TransportStatCards
        routes={routes}
        assignments={assignments}
        alerts={alerts}
        boardingLogs={boardingLogs}
      />

      <Tabs defaultValue="routes">
        <TabsList>
          <TabsTrigger value="routes">
            <Bus className="h-4 w-4 mr-1.5" /> Routes
          </TabsTrigger>
          <TabsTrigger value="assignments">
            <UserPlus className="h-4 w-4 mr-1.5" /> Assignments
          </TabsTrigger>
          <TabsTrigger value="boarding">
            <LogIn className="h-4 w-4 mr-1.5" /> Boarding Logs
          </TabsTrigger>
          <TabsTrigger value="alerts">
            <AlertTriangle className="h-4 w-4 mr-1.5" /> Alerts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="routes">
          <RoutesTab
            routes={routes}
            onCreateRoute={createRoute}
            onUpdateRoute={updateRoute}
            onDeleteRoute={deleteRoute}
          />
        </TabsContent>

        <TabsContent value="assignments">
          <AssignmentsTab
            assignments={assignments}
            routes={routes}
            onCreateAssignment={createAssignment}
            onUpdateAssignment={updateAssignment}
            onDeleteAssignment={deleteAssignment}
            onFilterByRoute={(routeId) => fetchAssignments(routeId)}
          />
        </TabsContent>

        <TabsContent value="boarding">
          <BoardingLogsTab
            boardingLogs={boardingLogs}
            routes={routes}
            onFetchLogs={fetchBoardingLogs}
            onCreateLog={createBoardingLog}
            onLogAlight={logAlight}
          />
        </TabsContent>

        <TabsContent value="alerts">
          <AlertsTab
            alerts={alerts}
            routes={routes}
            onCreateAlert={createAlert}
            onResolveAlert={resolveAlert}
            onDeleteAlert={deleteAlert}
            onFetchAlerts={fetchAlerts}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
