import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});
export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  schoolName: z.string().min(2, 'School name is required'),
  adminFirstName: z.string().min(2, 'First name is required'),
  adminLastName: z.string().min(2, 'Last name is required'),
  adminEmail: z.string().email('Please enter a valid email'),
  adminPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/\d/, 'Password must contain at least one digit'),
  confirmPassword: z.string(),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  province: z.string().min(2, 'Province is required'),
  postalCode: z.string().min(4, 'Postal code is required'),
  schoolType: z.enum(['primary', 'secondary', 'combined']),
}).refine((data) => data.adminPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});
export type RegisterFormData = z.infer<typeof registerSchema>;

export const studentRegisterSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.string().email('Please enter a valid email'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/\d/, 'Password must contain at least one digit'),
  confirmPassword: z.string(),
  classroomCode: z.string().length(6, 'Classroom code must be exactly 6 characters'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});
export type StudentRegisterFormData = z.infer<typeof studentRegisterSchema>;

export const teacherRegisterSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.string().email('Please enter a valid email'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/\d/, 'Password must contain at least one digit'),
  confirmPassword: z.string(),
  schoolName: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});
export type TeacherRegisterFormData = z.infer<typeof teacherRegisterSchema>;

export const studentSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.string().email('Please enter a valid email'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(['male', 'female', 'other'], { error: 'Gender is required' }),
  gradeId: z.string().min(1, 'Grade is required'),
  classId: z.string().min(1, 'Class is required'),
  admissionNumber: z.string().min(1, 'Admission number is required'),
  guardianId: z.string().optional(),
  homeLanguage: z.string().optional(),
  previousSchool: z.string().optional(),
  transportRequired: z.boolean().optional(),
  afterCareRequired: z.boolean().optional(),
});

export const medicalProfileSchema = z.object({
  allergies: z.array(z.string()),
  conditions: z.array(z.string()),
  bloodType: z.string().optional(),
  emergencyContacts: z.array(z.object({
    name: z.string().min(1, 'Name is required'),
    relationship: z.string().min(1, 'Relationship is required'),
    phone: z.string().min(1, 'Phone is required'),
  })),
  medicalAidInfo: z.object({
    provider: z.string().min(1, 'Provider is required'),
    memberNumber: z.string().min(1, 'Member number is required'),
    mainMember: z.string().min(1, 'Main member is required'),
  }).optional(),
});

export const staffSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  department: z.string().optional(),
  subjects: z.string().optional(),
});

export const feeTypeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  amount: z.number().min(1, 'Amount must be greater than 0'),
  frequency: z.enum(['once_off', 'per_term', 'per_year', 'monthly'], { error: 'Frequency is required' }),
  category: z.enum(['tuition', 'extramural', 'camp', 'uniform', 'transport', 'other'], { error: 'Category is required' }),
});

export const eventSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  type: z.enum(['academic', 'sports', 'cultural', 'social', 'meeting'], { error: 'Event type is required' }),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  location: z.string().optional(),
  isAllDay: z.boolean(),
});

export const messageSchema = z.object({
  subject: z.string().min(3, 'Subject must be at least 3 characters'),
  body: z.string().min(10, 'Message must be at least 10 characters'),
  type: z.enum(['message', 'announcement', 'alert'], { error: 'Message type is required' }),
  priority: z.enum(['low', 'normal', 'high', 'urgent'], { error: 'Priority is required' }),
  recipientIds: z.array(z.string()).min(1, 'At least one recipient is required'),
});

export const homeworkSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  subjectId: z.string().min(1, 'Subject is required'),
  classId: z.string().min(1, 'Class is required'),
  dueDate: z.string().min(1, 'Due date is required'),
});

export const disciplineSchema = z.object({
  studentId: z.string().min(1, 'Student is required'),
  type: z.enum(['merit', 'demerit'], { error: 'Type is required' }),
  points: z.number().min(1, 'Points must be at least 1'),
  category: z.string().min(1, 'Category is required'),
  description: z.string().min(5, 'Description must be at least 5 characters'),
});

export const foundItemSchema = z.object({
  name: z.string().min(2, 'Item name must be at least 2 characters'),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  category: z.enum(['clothing', 'stationery', 'lunch_box', 'electronics', 'sports', 'bags', 'other'], { error: 'Category is required' }),
  location: z.string().min(2, 'Location is required'),
  photoUrl: z.string().optional(),
  dateFound: z.string().min(1, 'Date found is required'),
});

export const lostReportSchema = z.object({
  studentId: z.string().min(1, 'Please select a child'),
  itemName: z.string().min(2, 'Item name must be at least 2 characters'),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  category: z.enum(['clothing', 'stationery', 'lunch_box', 'electronics', 'sports', 'bags', 'other'], { error: 'Category is required' }),
  locationLost: z.string().min(2, 'Location is required'),
  dateLost: z.string().min(1, 'Date lost is required'),
});

export type StudentFormData = z.infer<typeof studentSchema>;
export type MedicalProfileFormData = z.infer<typeof medicalProfileSchema>;
export type StaffFormData = z.infer<typeof staffSchema>;
export type FeeTypeFormData = z.infer<typeof feeTypeSchema>;
export type EventFormData = z.infer<typeof eventSchema>;
export type MessageFormData = z.infer<typeof messageSchema>;
export type HomeworkFormData = z.infer<typeof homeworkSchema>;
export type DisciplineFormData = z.infer<typeof disciplineSchema>;
export type FoundItemFormData = z.infer<typeof foundItemSchema>;
export type LostReportFormData = z.infer<typeof lostReportSchema>;
