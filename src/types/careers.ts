// Career & University Guidance — TypeScript Interfaces

export interface TermResult {
  term: number;
  percentage: number;
  assessmentCount: number;
}

export interface SubjectRecord {
  subjectId: string;
  name: string;
  level: string;
  code: string;
  terms: TermResult[];
  finalPercentage: number;
  apsPoints: number;
}

export interface AcademicYear {
  year: number;
  grade: string;
  subjects: SubjectRecord[];
  totalAPS: number;
  promoted: boolean;
  promotionStatus: 'promoted' | 'condoned' | 'retained';
}

export interface Extracurricular {
  year: number;
  activity: string;
  role: string;
  description: string;
  verifiedBy?: string;
}

export interface CommunityServiceEntry {
  year: number;
  organization: string;
  hours: number;
  description: string;
  verifiedBy?: string;
}

export interface StudentPortfolio {
  id: string;
  studentId: string;
  student?: {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
  };
  academicHistory: AcademicYear[];
  achievements: {
    year: number;
    title: string;
    category: string;
    points: number;
  }[];
  extracurriculars: Extracurricular[];
  communityService: CommunityServiceEntry[];
}

// --- APS ---

export interface APSConversionEntry {
  min: number;
  max: number;
  rating: number;
  points: number;
  description: string;
}

export interface APSSubject {
  subjectId: string;
  name: string;
  level: string;
  currentPercentage: number;
  rating: number;
  apsPoints: number;
}

export interface APSResult {
  totalAPS: number;
  maxAPS: number;
  lifeOrientation: {
    percentage: number;
    apsPoints: number;
    note?: string;
  };
  subjects: APSSubject[];
  apsConversionTable: APSConversionEntry[];
}

export interface APSSimulationAdjustment {
  subjectId: string;
  hypotheticalPercentage: number;
}

export interface APSSimulationSubject {
  name: string;
  currentPercentage: number;
  hypotheticalPercentage: number;
  currentAPS: number;
  simulatedAPS: number;
  change: string;
}

export interface APSSimulationResult {
  currentAPS: number;
  simulatedAPS: number;
  improvement: number;
  subjects: APSSimulationSubject[];
  newProgrammesUnlocked: number;
}

// --- Universities ---

export interface University {
  id: string;
  name: string;
  shortName: string;
  type: 'traditional' | 'comprehensive' | 'university_of_technology' | 'tvet' | 'private';
  province: string;
  city: string;
  logo?: string;
  website?: string;
  applicationPortalUrl?: string;
  applicationOpenDate?: string;
  applicationCloseDate?: string;
  applicationFee: number;
  generalRequirements?: string;
  contactEmail?: string;
  contactPhone?: string;
  programmeCount?: number;
  isActive?: boolean;
}

export type UniversityType = University['type'];

// --- Programmes ---

export interface SubjectRequirement {
  subjectName: string;
  minimumPercentage: number;
  isCompulsory: boolean;
}

export interface Programme {
  id: string;
  universityId: string;
  universityName?: string;
  universityLogo?: string;
  faculty: string;
  department?: string;
  name: string;
  qualificationType: 'bachelor' | 'diploma' | 'higher_certificate' | 'postgrad_diploma';
  duration: string;
  minimumAPS: number;
  subjectRequirements: SubjectRequirement[];
  nbtRequired: { al: boolean; ql: boolean; mat: boolean };
  nbtMinimumScores?: { al?: number; ql?: number; mat?: number };
  careerOutcomes: string[];
  annualTuition?: number;
  linkedBursaries?: string[];
  applicationDeadline?: string;
  additionalNotes?: string;
  dataVerifiedDate?: string;
  isActive?: boolean;
}

export type QualificationType = Programme['qualificationType'];

// --- Programme Matcher ---

export interface SubjectGap {
  subjectName: string;
  required: number;
  actual: number;
  gap: number;
}

export interface ProgrammeMatch {
  programmeId: string;
  programmeName: string;
  universityName: string;
  universityLogo?: string;
  faculty: string;
  qualificationType: string;
  status: 'eligible' | 'close' | 'not_eligible';
  apsRequired: number;
  apsActual: number;
  apsGap: number;
  subjectGaps: SubjectGap[];
  missingSubjects: string[];
  overallFit: number;
  annualTuition?: number;
  applicationDeadline?: string;
}

export interface ProgrammeMatchSummary {
  eligible: number;
  close: number;
  total: number;
}

export interface ProgrammeMatchResult {
  studentAPS: number;
  summary: ProgrammeMatchSummary;
  matches: ProgrammeMatch[];
  page: number;
  limit: number;
  totalPages: number;
}

// --- Applications ---

export interface AppDocument {
  name: string;
  type: 'id_copy' | 'transcript' | 'proof_of_payment' | 'motivation_letter' | 'other';
  url: string;
  uploadedAt: string;
}

export interface CareerApplication {
  id: string;
  studentId: string;
  programmeId: string;
  universityId: string;
  programmeName?: string;
  universityName?: string;
  universityLogo?: string;
  status: 'draft' | 'submitted' | 'acknowledged' | 'accepted' | 'waitlisted' | 'rejected';
  submittedAt?: string;
  applicationReference?: string;
  documents: AppDocument[];
  applicationFee?: { amount: number; paid: boolean };
  notes?: string;
  responseDate?: string;
  responseDetails?: string;
  createdAt: string;
}

export type ApplicationStatus = CareerApplication['status'];

export interface Deadline {
  type: 'application' | 'bursary';
  name: string;
  deadline: string;
  daysRemaining: number;
  status: string;
  urgent: boolean;
}

// --- Aptitude ---

export interface AptitudeQuestion {
  id: string;
  text: string;
  type: 'likert';
  options: string[];
}

export interface AptitudeSection {
  name: string;
  description: string;
  questions: AptitudeQuestion[];
}

export interface AptitudeQuestionnaire {
  sections: AptitudeSection[];
  totalQuestions: number;
  estimatedMinutes: number;
}

export interface ClusterResult {
  name: string;
  score: number;
  rank: number;
  description: string;
}

export interface AptitudeResult {
  id: string;
  clusters: ClusterResult[];
  personalityType: string;
  suggestedCareers: string[];
  completedAt: string;
}

// --- Career Explorer ---

export interface Career {
  name: string;
  cluster: string;
  description: string;
  salaryRange: { entry: number; mid: number; senior: number };
  demand: 'growing' | 'stable' | 'declining';
  requiredQualification: string;
  linkedProgrammeCount: number;
  skills: string[];
}

// --- Subject Choice Advisor ---

export interface SubjectCombinationRecommendation {
  subjectCombination: string[];
  reasoning: string;
  programmesUnlocked: number;
  careerPaths: string[];
}

export interface SubjectWarning {
  subject: string;
  impact: string;
}

export interface SubjectAdvisorResult {
  aptitudeTopCluster: string;
  currentPerformance: Record<string, number>;
  recommendations: SubjectCombinationRecommendation[];
  warnings: SubjectWarning[];
}

// --- Bursaries ---

export interface Bursary {
  id: string;
  name: string;
  provider: string;
  description?: string;
  eligibilityCriteria?: string;
  minimumAPS?: number;
  fieldOfStudy: string[];
  coverageDetails?: string;
  applicationOpenDate?: string;
  applicationCloseDate?: string;
  applicationUrl?: string;
  linkedUniversities?: string[];
  annualValue?: number;
  isActive?: boolean;
}

export interface CareersPaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
