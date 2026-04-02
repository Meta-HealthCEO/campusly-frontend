import { z } from 'zod';

export const universitySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  shortName: z.string().min(1, 'Short name is required'),
  type: z.enum([
    'traditional',
    'comprehensive',
    'university_of_technology',
    'tvet',
    'private',
  ]),
  province: z.string().min(1, 'Province is required'),
  city: z.string().min(1, 'City is required'),
  logo: z.string().optional(),
  website: z.string().optional(),
  applicationPortalUrl: z.string().optional(),
  applicationOpenDate: z.string().optional(),
  applicationCloseDate: z.string().optional(),
  applicationFee: z.number().min(0).default(0),
  generalRequirements: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  contactPhone: z.string().optional(),
});

export type UniversityFormData = z.infer<typeof universitySchema>;

export const programmeSchema = z.object({
  universityId: z.string().min(1, 'University is required'),
  faculty: z.string().min(1, 'Faculty is required'),
  department: z.string().optional(),
  name: z.string().min(1, 'Programme name is required'),
  qualificationType: z.enum([
    'bachelor',
    'diploma',
    'higher_certificate',
    'postgrad_diploma',
  ]),
  duration: z.string().min(1, 'Duration is required'),
  minimumAPS: z.number().min(0).max(42),
  careerOutcomes: z.array(z.string()).default([]),
  annualTuition: z.number().min(0).optional(),
  applicationDeadline: z.string().optional(),
  additionalNotes: z.string().optional(),
});

export type ProgrammeFormData = z.infer<typeof programmeSchema>;

export const bursarySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  provider: z.string().min(1, 'Provider is required'),
  description: z.string().optional(),
  eligibilityCriteria: z.string().optional(),
  minimumAPS: z.number().min(0).max(42).optional(),
  fieldOfStudy: z.array(z.string()).default(['any']),
  coverageDetails: z.string().optional(),
  applicationOpenDate: z.string().optional(),
  applicationCloseDate: z.string().optional(),
  applicationUrl: z.string().optional(),
  annualValue: z.number().min(0).optional(),
});

export type BursaryFormData = z.infer<typeof bursarySchema>;
