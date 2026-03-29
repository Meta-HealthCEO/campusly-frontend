import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  schoolName: z.string().min(2, 'School name is required'),
  adminFirstName: z.string().min(2, 'First name is required'),
  adminLastName: z.string().min(2, 'Last name is required'),
  adminEmail: z.string().email('Please enter a valid email'),
  adminPassword: z.string().min(8, 'Password must be at least 8 characters'),
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

export const studentSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.string().email('Please enter a valid email').optional(),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(['male', 'female', 'other']),
  gradeId: z.string().min(1, 'Grade is required'),
  classId: z.string().min(1, 'Class is required'),
  address: z.string().min(5, 'Address is required'),
  parentId: z.string().min(1, 'Parent is required'),
  allergies: z.string().optional(),
  medicalConditions: z.string().optional(),
});
export type StudentFormData = z.infer<typeof studentSchema>;

export const staffSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.string().email('Please enter a valid email'),
  phone: z.string().min(10, 'Phone number is required'),
  department: z.string().optional(),
  employeeNumber: z.string().min(1, 'Employee number is required'),
  subjects: z.string().optional(),
  qualifications: z.string().optional(),
});
export type StaffFormData = z.infer<typeof staffSchema>;

export const feeTypeSchema = z.object({
  name: z.string().min(2, 'Fee name is required'),
  description: z.string().min(5, 'Description is required'),
  amount: z.number().min(100, 'Amount must be at least R1.00'),
  frequency: z.enum(['once', 'monthly', 'quarterly', 'annually']),
  isOptional: z.boolean(),
});
export type FeeTypeFormData = z.infer<typeof feeTypeSchema>;

export const homeworkSchema = z.object({
  title: z.string().min(3, 'Title is required'),
  description: z.string().min(10, 'Description is required'),
  subjectId: z.string().min(1, 'Subject is required'),
  classId: z.string().min(1, 'Class is required'),
  dueDate: z.string().min(1, 'Due date is required'),
});
export type HomeworkFormData = z.infer<typeof homeworkSchema>;

export const eventSchema = z.object({
  title: z.string().min(3, 'Title is required'),
  description: z.string().min(10, 'Description is required'),
  type: z.enum(['academic', 'sports', 'cultural', 'social', 'meeting']),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  location: z.string().optional(),
  isAllDay: z.boolean(),
  requiresConsent: z.boolean(),
  ticketPrice: z.number().optional(),
  maxAttendees: z.number().optional(),
});
export type EventFormData = z.infer<typeof eventSchema>;

export const disciplineSchema = z.object({
  studentId: z.string().min(1, 'Student is required'),
  type: z.enum(['merit', 'demerit']),
  category: z.string().min(2, 'Category is required'),
  points: z.number().min(1, 'Points must be at least 1'),
  description: z.string().min(5, 'Description is required'),
});
export type DisciplineFormData = z.infer<typeof disciplineSchema>;

export const messageSchema = z.object({
  recipientIds: z.array(z.string()).min(1, 'At least one recipient is required'),
  subject: z.string().min(3, 'Subject is required'),
  body: z.string().min(10, 'Message body is required'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
});
export type MessageFormData = z.infer<typeof messageSchema>;
