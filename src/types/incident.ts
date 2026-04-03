// ============================================================
// Incident Types
// ============================================================

export type IncidentType =
  | 'bullying' | 'injury' | 'property_damage' | 'safety_concern'
  | 'substance' | 'theft' | 'verbal_abuse' | 'cyber_bullying' | 'other';

export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';

export type IncidentStatus = 'reported' | 'investigating' | 'resolved' | 'escalated';

export type PartyRole = 'perpetrator' | 'victim' | 'bystander' | 'witness';

export type WitnessType = 'student' | 'staff' | 'other';

export type ActionStatus = 'pending' | 'in_progress' | 'completed' | 'overdue';

export interface InvolvedParty {
  studentId: string | { id: string; admissionNumber?: string };
  role: PartyRole;
  description?: string;
  parentNotified: boolean;
  parentNotifiedAt?: string;
}

export interface IncidentWitness {
  type: WitnessType;
  studentId?: string | { id: string; admissionNumber?: string };
  staffId?: string | { id: string; firstName?: string; lastName?: string };
  name?: string;
  statement?: string;
}

export interface StatusHistoryEntry {
  status: IncidentStatus;
  date: string;
  changedBy?: { id: string; firstName?: string; lastName?: string };
  notes?: string;
}

export interface Incident {
  id: string;
  schoolId: string;
  incidentNumber: string;
  type: IncidentType;
  severity: SeverityLevel;
  title: string;
  description: string;
  location?: string;
  incidentDate: string;
  incidentTime?: string;
  status: IncidentStatus;
  involvedParties: InvolvedParty[];
  witnesses: IncidentWitness[];
  immediateActionTaken?: string;
  reportedBy: { id: string; firstName?: string; lastName?: string };
  assignedTo?: { id: string; firstName?: string; lastName?: string };
  statusHistory: StatusHistoryEntry[];
  resolutionSummary?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IncidentAction {
  id: string;
  incidentId: string;
  description: string;
  assignedTo: { id: string; firstName?: string; lastName?: string };
  dueDate: string;
  status: ActionStatus;
  completedAt?: string;
  notes?: string;
  createdBy: { id: string; firstName?: string; lastName?: string };
  createdAt: string;
}

export interface ConfidentialNote {
  id: string;
  incidentId: string;
  content: string;
  createdBy: { id: string; firstName?: string; lastName?: string };
  createdAt: string;
  updatedAt: string;
}

export interface IncidentReportSummary {
  totalIncidents: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  byStatus: Record<string, number>;
  averageResolutionDays: number;
  monthlyTrend: Array<{ month: string; count: number }>;
  topLocations: Array<{ location: string; count: number }>;
}

export interface CreateIncidentPayload {
  type: IncidentType;
  severity: SeverityLevel;
  title: string;
  description: string;
  location?: string;
  incidentDate: string;
  incidentTime?: string;
  involvedParties?: Array<{
    studentId: string;
    role: PartyRole;
    description?: string;
  }>;
  witnesses?: Array<{
    type: WitnessType;
    studentId?: string;
    staffId?: string;
    name?: string;
  }>;
  immediateActionTaken?: string;
}

export interface UpdateIncidentPayload extends Partial<CreateIncidentPayload> {
  status?: IncidentStatus;
  assignedTo?: string;
  resolutionSummary?: string;
}

export interface CreateActionPayload {
  description: string;
  assignedToUserId: string;
  dueDate: string;
}

export interface UpdateActionPayload {
  description?: string;
  status?: ActionStatus;
  completedAt?: string;
  notes?: string;
}
