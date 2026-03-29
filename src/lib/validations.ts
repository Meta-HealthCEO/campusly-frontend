import { z } from 'zod';

export const studentSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(['male', 'female', 'other'], { error: 'Gender is required' }),
  gradeId: z.string().min(1, 'Grade is required'),
  classId: z.string().min(1, 'Class is required'),
  address: z.string().min(5, 'Address must be at least 5 characters'),
  parentId: z.string().min(1, 'Parent is required'),
});

export const staffSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  department: z.string().min(1, 'Department is required'),
  subjects: z.string().min(1, 'At least one subject is required'),
});

export const feeTypeSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  amount: z.number().min(1, 'Amount must be greater than 0'),
  frequency: z.enum(['once', 'monthly', 'quarterly', 'annually'], { error: 'Frequency is required' }),
  isOptional: z.boolean(),
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

export type StudentFormData = z.infer<typeof studentSchema>;
export type StaffFormData = z.infer<typeof staffSchema>;
export type FeeTypeFormData = z.infer<typeof feeTypeSchema>;
export type EventFormData = z.infer<typeof eventSchema>;
export type MessageFormData = z.infer<typeof messageSchema>;
export type HomeworkFormData = z.infer<typeof homeworkSchema>;
export type DisciplineFormData = z.infer<typeof disciplineSchema>;
