// ============================================================
// Migration Module TypeScript Interfaces
// ============================================================

export type SourceSystem = 'd6_connect' | 'karri' | 'adam' | 'schooltool' | 'excel' | 'csv';
export type MigrationStatus = 'pending' | 'validating' | 'importing' | 'completed' | 'failed';
export type EntityType = 'student' | 'parent' | 'staff' | 'grade' | 'fee';

export interface MigrationValidationError {
  row: number;
  field: string;
  message: string;
}

export interface ValidationResults {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicates: number;
  errors: MigrationValidationError[];
}

export interface ImportResults {
  studentsCreated: number;
  parentsCreated: number;
  staffCreated: number;
  gradesCreated: number;
  skipped: number;
  errors: MigrationValidationError[];
}

export interface UploadedFile {
  originalName: string;
  fileUrl: string;
  fileSize: number;
}

export interface PerformedByUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface MigrationJob {
  id: string;
  schoolId: string;
  status: MigrationStatus;
  sourceSystem: SourceSystem;
  uploadedFile: UploadedFile;
  mapping: Record<string, string>;
  validationResults?: ValidationResults;
  importResults?: ImportResults;
  startedAt?: string;
  completedAt?: string;
  performedBy: string | PerformedByUser;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  transform?: string;
}

export interface MigrationTemplate {
  id: string;
  sourceSystem: SourceSystem;
  entityType: EntityType;
  fieldMappings: FieldMapping[];
  isDefault: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MigrationPreview {
  mapping: Record<string, string>;
  sampleRows: Record<string, string>[];
}

export interface UploadFileInput {
  schoolId: string;
  sourceSystem: SourceSystem;
  originalName: string;
  fileUrl: string;
  fileSize: number;
}

export interface MigrationHistoryResponse {
  data: MigrationJob[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

export const SOURCE_SYSTEM_LABELS: Record<SourceSystem, string> = {
  d6_connect: 'd6 Connect',
  karri: 'Karri',
  adam: 'ADAM',
  schooltool: 'SchoolTool',
  excel: 'Excel File',
  csv: 'CSV File',
};

export const SOURCE_SYSTEM_DESCRIPTIONS: Record<SourceSystem, string> = {
  d6_connect: 'South African school management system. Pre-configured field mappings for learner exports.',
  karri: 'South African school admin platform. Pre-configured mappings for student and parent data.',
  adam: 'ADAM school administration system. Pre-configured mappings including LURITS numbers.',
  schooltool: 'SchoolTool management system. Manual field mapping required.',
  excel: 'Import from an Excel spreadsheet (.xlsx). Manual field mapping required.',
  csv: 'Import from a CSV file (.csv). Manual field mapping required.',
};

export const STATUS_COLORS: Record<MigrationStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  validating: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  importing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export const CAMPUSLY_TARGET_FIELDS = [
  'firstName',
  'lastName',
  'saIdNumber',
  'dateOfBirth',
  'grade',
  'class',
  'gender',
  'homeLanguage',
  'admissionNumber',
  'parentEmail',
  'parentPhone',
  'luritsNumber',
  'address',
  'phone',
  'email',
] as const;

export type CampuslyTargetField = typeof CAMPUSLY_TARGET_FIELDS[number];
