import type {
  User, School, Student, Parent, Teacher, Grade, SchoolClass, Subject,
  TimetableSlot, Attendance, Assessment, StudentGrade, Homework, HomeworkSubmission,
  FeeType, Invoice, Payment, Wallet, WalletTransaction, TuckshopItem, TuckshopOrder,
  Message, Notification, SchoolEvent, TransportRoute, LibraryBook, BookBorrowing,
  DisciplineRecord, ConsentForm, House, Achievement, StudentAchievement,
  DebtorEntry, DailySalesSummary, DashboardStats,
  Tenant, PlatformInvoice, SupportTicket, SupportMessage, PlatformStats,
  FoundItem, LostReport,
} from '@/types';

// ============== Users ==============
export const mockUsers: User[] = [
  { id: 'u1', email: 'admin@greenfield.edu.za', firstName: 'Thabo', lastName: 'Molefe', role: 'admin', phone: '0821234567', schoolId: 's1', isActive: true, avatar: '', createdAt: '2024-01-15T00:00:00Z', updatedAt: '2024-01-15T00:00:00Z' },
  { id: 'u2', email: 'teacher@greenfield.edu.za', firstName: 'Naledi', lastName: 'Nkosi', role: 'teacher', phone: '0832345678', schoolId: 's1', isActive: true, avatar: '', createdAt: '2024-02-01T00:00:00Z', updatedAt: '2024-02-01T00:00:00Z' },
  { id: 'u3', email: 'parent@greenfield.edu.za', firstName: 'Sipho', lastName: 'Dlamini', role: 'parent', phone: '0843456789', schoolId: 's1', isActive: true, avatar: '', createdAt: '2024-02-15T00:00:00Z', updatedAt: '2024-02-15T00:00:00Z' },
  { id: 'u4', email: 'student@greenfield.edu.za', firstName: 'Lerato', lastName: 'Dlamini', role: 'student', phone: '', schoolId: 's1', isActive: true, avatar: '', createdAt: '2024-03-01T00:00:00Z', updatedAt: '2024-03-01T00:00:00Z' },
  { id: 'u5', email: 'tuckshop@greenfield.edu.za', firstName: 'Maria', lastName: 'van der Merwe', role: 'tuckshop', phone: '0854567890', schoolId: 's1', isActive: true, avatar: '', createdAt: '2024-03-01T00:00:00Z', updatedAt: '2024-03-01T00:00:00Z' },
  { id: 'u6', email: 'teacher2@greenfield.edu.za', firstName: 'James', lastName: 'Botha', role: 'teacher', phone: '0865678901', schoolId: 's1', isActive: true, avatar: '', createdAt: '2024-02-01T00:00:00Z', updatedAt: '2024-02-01T00:00:00Z' },
  { id: 'u7', email: 'parent2@greenfield.edu.za', firstName: 'Zanele', lastName: 'Mbeki', role: 'parent', phone: '0876789012', schoolId: 's1', isActive: true, avatar: '', createdAt: '2024-02-15T00:00:00Z', updatedAt: '2024-02-15T00:00:00Z' },
  { id: 'u8', email: 'student2@greenfield.edu.za', firstName: 'Themba', lastName: 'Mbeki', role: 'student', phone: '', schoolId: 's1', isActive: true, avatar: '', createdAt: '2024-03-01T00:00:00Z', updatedAt: '2024-03-01T00:00:00Z' },
  { id: 'u9', email: 'superadmin@campusly.app', firstName: 'Refilwe', lastName: 'Sithole', role: 'super_admin', phone: '0800001234', schoolId: '', isActive: true, avatar: '', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
];

// ============== School ==============
export const mockSchool: School = {
  id: 's1', name: 'Greenfield Academy', slug: 'greenfield-academy',
  logo: '', address: '45 Jacaranda Avenue', city: 'Pretoria', province: 'Gauteng',
  postalCode: '0181', phone: '012 345 6789', email: 'info@greenfield.edu.za',
  website: 'www.greenfield.edu.za', type: 'combined',
  enabledModules: ['fees', 'wallet', 'tuckshop', 'transport', 'communication', 'events', 'library', 'discipline'],
  settings: { currency: 'ZAR', timezone: 'Africa/Johannesburg', academicYearStart: '2025-01-15', academicYearEnd: '2025-12-05', attendanceMethod: 'period', gradingSystem: 'percentage' },
  createdAt: '2024-01-01T00:00:00Z',
};

// ============== Houses ==============
export const mockHouses: House[] = [
  { id: 'h1', name: 'Eagles', color: '#2563EB', points: 1245, motto: 'Soar Above' },
  { id: 'h2', name: 'Lions', color: '#F97316', points: 1180, motto: 'Courage and Strength' },
  { id: 'h3', name: 'Dolphins', color: '#10B981', points: 1320, motto: 'Grace in Motion' },
  { id: 'h4', name: 'Leopards', color: '#F59E0B', points: 1150, motto: 'Swift and Silent' },
];

// ============== Grades & Classes ==============
export const mockGrades: Grade[] = [
  { id: 'g1', name: 'Grade 8', level: 8, schoolId: 's1', classes: [] },
  { id: 'g2', name: 'Grade 9', level: 9, schoolId: 's1', classes: [] },
  { id: 'g3', name: 'Grade 10', level: 10, schoolId: 's1', classes: [] },
  { id: 'g4', name: 'Grade 11', level: 11, schoolId: 's1', classes: [] },
  { id: 'g5', name: 'Grade 12', level: 12, schoolId: 's1', classes: [] },
];

export const mockClasses: SchoolClass[] = [
  { id: 'c1', name: '8A', gradeId: 'g1', grade: mockGrades[0], teacherId: 't1', teacher: {} as Teacher, capacity: 35, studentCount: 32 },
  { id: 'c2', name: '8B', gradeId: 'g1', grade: mockGrades[0], teacherId: 't2', teacher: {} as Teacher, capacity: 35, studentCount: 30 },
  { id: 'c3', name: '9A', gradeId: 'g2', grade: mockGrades[1], teacherId: 't1', teacher: {} as Teacher, capacity: 35, studentCount: 33 },
  { id: 'c4', name: '10A', gradeId: 'g3', grade: mockGrades[2], teacherId: 't2', teacher: {} as Teacher, capacity: 35, studentCount: 28 },
  { id: 'c5', name: '11A', gradeId: 'g4', grade: mockGrades[3], teacherId: 't1', teacher: {} as Teacher, capacity: 35, studentCount: 25 },
  { id: 'c6', name: '12A', gradeId: 'g5', grade: mockGrades[4], teacherId: 't2', teacher: {} as Teacher, capacity: 35, studentCount: 22 },
];

// ============== Teachers ==============
export const mockTeachers: Teacher[] = [
  { id: 't1', userId: 'u2', user: mockUsers[1], employeeNumber: 'EMP001', department: 'Mathematics', subjects: ['Mathematics', 'Physical Science'], qualifications: ['B.Ed', 'Hons Mathematics'], hireDate: '2020-01-15', classIds: ['c1', 'c3', 'c5'] },
  { id: 't2', userId: 'u6', user: mockUsers[5], employeeNumber: 'EMP002', department: 'Languages', subjects: ['English', 'Afrikaans'], qualifications: ['B.A.', 'PGCE'], hireDate: '2019-06-01', classIds: ['c2', 'c4', 'c6'] },
];

// ============== Students ==============
const studentNames = [
  { first: 'Lerato', last: 'Dlamini', gender: 'female' as const },
  { first: 'Themba', last: 'Mbeki', gender: 'male' as const },
  { first: 'Ayanda', last: 'Khumalo', gender: 'female' as const },
  { first: 'Bongani', last: 'Nzimande', gender: 'male' as const },
  { first: 'Nomsa', last: 'Sithole', gender: 'female' as const },
  { first: 'Kagiso', last: 'Mokoena', gender: 'male' as const },
  { first: 'Palesa', last: 'Mahlangu', gender: 'female' as const },
  { first: 'Tshepiso', last: 'Radebe', gender: 'male' as const },
  { first: 'Lebo', last: 'Maseko', gender: 'female' as const },
  { first: 'Kabelo', last: 'Mthembu', gender: 'male' as const },
];

export const mockStudents: Student[] = studentNames.map((n, i) => ({
  id: `st${i + 1}`,
  userId: i === 0 ? 'u4' : i === 1 ? 'u8' : `us${i + 1}`,
  user: i === 0 ? mockUsers[3] : i === 1 ? mockUsers[7] : { ...mockUsers[3], id: `us${i + 1}`, firstName: n.first, lastName: n.last, email: `${n.first.toLowerCase()}@student.greenfield.edu.za` },
  admissionNumber: `GFA${2024}${String(i + 1).padStart(3, '0')}`,
  gradeId: mockClasses[i % mockClasses.length].gradeId,
  grade: mockClasses[i % mockClasses.length].grade,
  classId: mockClasses[i % mockClasses.length].id,
  class: mockClasses[i % mockClasses.length],
  dateOfBirth: `200${8 + (i % 3)}-0${(i % 9) + 1}-${10 + i}`,
  gender: n.gender,
  address: `${10 + i} Protea Street, Pretoria`,
  medicalInfo: { bloodType: 'O+', allergies: i === 3 ? ['peanuts', 'shellfish'] : [], conditions: [], medications: [], emergencyContact: 'Parent', emergencyPhone: `08${i}1234567` },
  parentIds: i === 0 ? ['p1'] : i === 1 ? ['p2'] : [`p${(i % 2) + 1}`],
  parents: [],
  walletId: `w${i + 1}`,
  wallet: undefined,
  isActive: true,
  enrolledDate: '2024-01-15',
  houseId: mockHouses[i % 4].id,
  house: mockHouses[i % 4],
}));

// ============== Parents ==============
export const mockParents: Parent[] = [
  { id: 'p1', userId: 'u3', user: mockUsers[2], relationship: 'father', occupation: 'Engineer', employer: 'Sasol', studentIds: ['st1'], students: [mockStudents[0]] },
  { id: 'p2', userId: 'u7', user: mockUsers[6], relationship: 'mother', occupation: 'Teacher', employer: 'Dept of Education', studentIds: ['st2'], students: [mockStudents[1]] },
];

// ============== Subjects ==============
export const mockSubjects: Subject[] = [
  { id: 'sub1', name: 'Mathematics', code: 'MATH', gradeId: 'g1', teacherId: 't1', teacher: mockTeachers[0], isElective: false },
  { id: 'sub2', name: 'English Home Language', code: 'ENG', gradeId: 'g1', teacherId: 't2', teacher: mockTeachers[1], isElective: false },
  { id: 'sub3', name: 'Physical Science', code: 'PHSC', gradeId: 'g1', teacherId: 't1', teacher: mockTeachers[0], isElective: false },
  { id: 'sub4', name: 'Life Orientation', code: 'LO', gradeId: 'g1', teacherId: 't2', teacher: mockTeachers[1], isElective: false },
  { id: 'sub5', name: 'Afrikaans FAL', code: 'AFR', gradeId: 'g1', teacherId: 't2', teacher: mockTeachers[1], isElective: false },
  { id: 'sub6', name: 'Geography', code: 'GEO', gradeId: 'g1', teacherId: 't1', teacher: mockTeachers[0], isElective: true },
  { id: 'sub7', name: 'History', code: 'HIST', gradeId: 'g1', teacherId: 't2', teacher: mockTeachers[1], isElective: true },
];

// ============== Timetable ==============
const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const;
export const mockTimetable: TimetableSlot[] = days.flatMap((day, di) =>
  [0, 1, 2, 3, 4, 5].map((period) => ({
    id: `tt-${di}-${period}`,
    day,
    period: period + 1,
    startTime: `${7 + period}:${period < 3 ? '30' : '00'}`,
    endTime: `${8 + period}:${period < 3 ? '15' : '45'}`,
    subjectId: mockSubjects[(di + period) % mockSubjects.length].id,
    subject: mockSubjects[(di + period) % mockSubjects.length],
    classId: 'c1',
    teacherId: period % 2 === 0 ? 't1' : 't2',
    room: `Room ${101 + (period % 6)}`,
  }))
);

// ============== Attendance ==============
export const mockAttendance: Attendance[] = mockStudents.slice(0, 5).flatMap((student, si) =>
  Array.from({ length: 20 }, (_, di) => ({
    id: `att-${si}-${di}`,
    studentId: student.id,
    student,
    date: `2025-03-${String(di + 1).padStart(2, '0')}`,
    status: (di === 5 && si === 0) ? 'absent' as const : (di === 12 && si === 2) ? 'late' as const : 'present' as const,
    period: 1,
    note: undefined,
    markedById: 'u2',
    markedBy: mockUsers[1],
  }))
);

// ============== Assessments & Grades ==============
export const mockAssessments: Assessment[] = [
  { id: 'a1', name: 'Term 1 Test', type: 'test', subjectId: 'sub1', subject: mockSubjects[0], classId: 'c1', totalMarks: 100, weight: 25, date: '2025-02-15', term: 1 },
  { id: 'a2', name: 'March Exam', type: 'exam', subjectId: 'sub1', subject: mockSubjects[0], classId: 'c1', totalMarks: 150, weight: 50, date: '2025-03-20', term: 1 },
  { id: 'a3', name: 'Essay Assignment', type: 'assignment', subjectId: 'sub2', subject: mockSubjects[1], classId: 'c1', totalMarks: 50, weight: 20, date: '2025-02-28', term: 1 },
  { id: 'a4', name: 'Science Project', type: 'project', subjectId: 'sub3', subject: mockSubjects[2], classId: 'c1', totalMarks: 80, weight: 30, date: '2025-03-10', term: 1 },
];

export const mockStudentGrades: StudentGrade[] = mockStudents.slice(0, 5).flatMap((student, si) =>
  mockAssessments.map((assessment, ai) => ({
    id: `sg-${si}-${ai}`,
    studentId: student.id,
    student,
    assessmentId: assessment.id,
    assessment,
    marks: Math.floor(55 + Math.random() * 40),
    percentage: 0,
    comment: undefined,
    gradedById: 'u2',
  }))
).map(sg => ({ ...sg, percentage: Math.round((sg.marks / sg.assessment.totalMarks) * 100) }));

// ============== Homework ==============
export const mockHomework: Homework[] = [
  { id: 'hw1', title: 'Quadratic Equations Worksheet', description: 'Complete exercises 1-20 on quadratic equations. Show all working.', subjectId: 'sub1', subject: mockSubjects[0], classId: 'c1', teacherId: 't1', teacher: mockTeachers[0], dueDate: '2025-03-25', attachments: [], status: 'published', createdAt: '2025-03-18T08:00:00Z' },
  { id: 'hw2', title: 'Creative Writing: Short Story', description: 'Write a 500-word short story on the theme "Ubuntu". Use descriptive language.', subjectId: 'sub2', subject: mockSubjects[1], classId: 'c1', teacherId: 't2', teacher: mockTeachers[1], dueDate: '2025-03-28', attachments: [], status: 'published', createdAt: '2025-03-20T10:00:00Z' },
  { id: 'hw3', title: 'Newton Laws Summary', description: 'Summarize all three of Newton\'s Laws with real-world examples.', subjectId: 'sub3', subject: mockSubjects[2], classId: 'c1', teacherId: 't1', teacher: mockTeachers[0], dueDate: '2025-04-01', attachments: [], status: 'published', createdAt: '2025-03-22T09:00:00Z' },
];

export const mockSubmissions: HomeworkSubmission[] = mockStudents.slice(0, 3).map((student, i) => ({
  id: `sub-${i}`,
  homeworkId: 'hw1',
  homework: mockHomework[0],
  studentId: student.id,
  student,
  content: 'Completed worksheet attached.',
  attachments: [],
  submittedAt: `2025-03-2${3 + i}T14:00:00Z`,
  grade: i === 0 ? 85 : undefined,
  feedback: i === 0 ? 'Excellent work, Lerato! Good use of the quadratic formula.' : undefined,
  gradedAt: i === 0 ? '2025-03-24T10:00:00Z' : undefined,
  status: i === 0 ? 'graded' : 'submitted',
}));

// ============== Fee Types & Invoices ==============
export const mockFeeTypes: FeeType[] = [
  { id: 'ft1', name: 'Tuition Fee', description: 'Monthly tuition fee', amount: 450000, frequency: 'monthly', gradeIds: ['g1', 'g2', 'g3', 'g4', 'g5'], isOptional: false, schoolId: 's1' },
  { id: 'ft2', name: 'Registration Fee', description: 'Annual registration', amount: 250000, frequency: 'annually', gradeIds: ['g1', 'g2', 'g3', 'g4', 'g5'], isOptional: false, schoolId: 's1' },
  { id: 'ft3', name: 'Transport Fee', description: 'Monthly transport', amount: 150000, frequency: 'monthly', gradeIds: ['g1', 'g2', 'g3', 'g4', 'g5'], isOptional: true, schoolId: 's1' },
  { id: 'ft4', name: 'Stationery Pack', description: 'Annual stationery', amount: 85000, frequency: 'annually', gradeIds: ['g1', 'g2', 'g3', 'g4', 'g5'], isOptional: true, schoolId: 's1' },
];

export const mockInvoices: Invoice[] = [
  { id: 'inv1', invoiceNumber: 'INV-2025-001', studentId: 'st1', student: mockStudents[0], parentId: 'p1', parent: mockParents[0], items: [{ id: 'ii1', feeTypeId: 'ft1', feeType: mockFeeTypes[0], description: 'Tuition - March 2025', amount: 450000, quantity: 1 }], totalAmount: 450000, paidAmount: 450000, balanceDue: 0, status: 'paid', dueDate: '2025-03-01', issuedDate: '2025-02-15', term: 1, year: 2025 },
  { id: 'inv2', invoiceNumber: 'INV-2025-002', studentId: 'st1', student: mockStudents[0], parentId: 'p1', parent: mockParents[0], items: [{ id: 'ii2', feeTypeId: 'ft1', feeType: mockFeeTypes[0], description: 'Tuition - April 2025', amount: 450000, quantity: 1 }], totalAmount: 450000, paidAmount: 0, balanceDue: 450000, status: 'sent', dueDate: '2025-04-01', issuedDate: '2025-03-15', term: 1, year: 2025 },
  { id: 'inv3', invoiceNumber: 'INV-2025-003', studentId: 'st2', student: mockStudents[1], parentId: 'p2', parent: mockParents[1], items: [{ id: 'ii3', feeTypeId: 'ft1', feeType: mockFeeTypes[0], description: 'Tuition - March 2025', amount: 450000, quantity: 1 }, { id: 'ii4', feeTypeId: 'ft3', feeType: mockFeeTypes[2], description: 'Transport - March 2025', amount: 150000, quantity: 1 }], totalAmount: 600000, paidAmount: 300000, balanceDue: 300000, status: 'partial', dueDate: '2025-03-01', issuedDate: '2025-02-15', term: 1, year: 2025 },
  { id: 'inv4', invoiceNumber: 'INV-2025-004', studentId: 'st3', student: mockStudents[2], parentId: 'p1', parent: mockParents[0], items: [{ id: 'ii5', feeTypeId: 'ft1', feeType: mockFeeTypes[0], description: 'Tuition - February 2025', amount: 450000, quantity: 1 }], totalAmount: 450000, paidAmount: 0, balanceDue: 450000, status: 'overdue', dueDate: '2025-02-01', issuedDate: '2025-01-15', term: 1, year: 2025 },
];

export const mockPayments: Payment[] = [
  { id: 'pay1', invoiceId: 'inv1', parentId: 'p1', amount: 450000, method: 'eft', reference: 'EFT-2025-001', status: 'completed', date: '2025-02-28' },
  { id: 'pay2', invoiceId: 'inv3', parentId: 'p2', amount: 300000, method: 'card', reference: 'CARD-2025-001', status: 'completed', date: '2025-03-05' },
];

// ============== Wallets ==============
export const mockWallets: Wallet[] = mockStudents.map((s, i) => ({
  id: `w${i + 1}`,
  studentId: s.id,
  balance: (5000 + Math.floor(Math.random() * 15000)) * (i < 5 ? 1 : 0),
  wristbandId: `WB-${String(i + 1).padStart(4, '0')}`,
  dailyLimit: 10000,
  isActive: true,
  lastTopUp: '2025-03-15T10:00:00Z',
}));

export const mockWalletTransactions: WalletTransaction[] = [
  { id: 'wt1', walletId: 'w1', type: 'topup', amount: 20000, balance: 20000, description: 'Wallet top-up', reference: 'TOP-001', createdAt: '2025-03-01T08:00:00Z' },
  { id: 'wt2', walletId: 'w1', type: 'purchase', amount: -3500, balance: 16500, description: 'Tuck shop - Pie & juice', createdAt: '2025-03-15T10:30:00Z' },
  { id: 'wt3', walletId: 'w1', type: 'purchase', amount: -2000, balance: 14500, description: 'Tuck shop - Sandwich', createdAt: '2025-03-16T10:15:00Z' },
  { id: 'wt4', walletId: 'w2', type: 'topup', amount: 15000, balance: 15000, description: 'Wallet top-up', reference: 'TOP-002', createdAt: '2025-03-05T09:00:00Z' },
  { id: 'wt5', walletId: 'w2', type: 'purchase', amount: -4500, balance: 10500, description: 'Tuck shop - Lunch combo', createdAt: '2025-03-18T11:00:00Z' },
];

// ============== Tuck Shop ==============
export const mockTuckshopItems: TuckshopItem[] = [
  { id: 'ti1', name: 'Chicken Pie', category: 'Hot Food', price: 2500, allergens: ['gluten', 'egg'], isAvailable: true, stockCount: 50 },
  { id: 'ti2', name: 'Ham & Cheese Sandwich', category: 'Sandwiches', price: 2000, allergens: ['gluten', 'dairy'], isAvailable: true, stockCount: 30 },
  { id: 'ti3', name: 'Fruit Juice (300ml)', category: 'Drinks', price: 1200, allergens: [], isAvailable: true, stockCount: 100 },
  { id: 'ti4', name: 'Water (500ml)', category: 'Drinks', price: 800, allergens: [], isAvailable: true, stockCount: 80 },
  { id: 'ti5', name: 'Banana', category: 'Fruit', price: 500, allergens: [], isAvailable: true, stockCount: 40 },
  { id: 'ti6', name: 'Peanut Butter Sandwich', category: 'Sandwiches', price: 1500, allergens: ['gluten', 'peanuts'], isAvailable: true, stockCount: 25 },
  { id: 'ti7', name: 'Yoghurt Cup', category: 'Snacks', price: 1500, allergens: ['dairy'], isAvailable: true, stockCount: 35 },
  { id: 'ti8', name: 'Muffin', category: 'Snacks', price: 1800, allergens: ['gluten', 'egg', 'dairy'], isAvailable: true, stockCount: 20 },
  { id: 'ti9', name: 'Boerewors Roll', category: 'Hot Food', price: 3000, allergens: ['gluten'], isAvailable: true, stockCount: 30 },
  { id: 'ti10', name: 'Rooibos Tea', category: 'Drinks', price: 600, allergens: [], isAvailable: true, stockCount: 60 },
];

export const mockTuckshopOrders: TuckshopOrder[] = [
  { id: 'to1', studentId: 'st1', student: mockStudents[0], items: [{ id: 'toi1', itemId: 'ti1', item: mockTuckshopItems[0], quantity: 1, price: 2500 }, { id: 'toi2', itemId: 'ti3', item: mockTuckshopItems[2], quantity: 1, price: 1200 }], totalAmount: 3700, walletTransactionId: 'wt2', servedBy: 'u5', createdAt: '2025-03-15T10:30:00Z' },
];

// ============== Messages & Notifications ==============
export const mockMessages: Message[] = [
  { id: 'm1', senderId: 'u1', sender: mockUsers[0], recipientIds: ['u3', 'u7'], subject: 'Term 1 Report Cards Ready', body: 'Dear Parents, Term 1 report cards are now available for collection.', type: 'announcement', priority: 'normal', isRead: false, attachments: [], createdAt: '2025-03-20T14:00:00Z' },
  { id: 'm2', senderId: 'u2', sender: mockUsers[1], recipientIds: ['u3'], subject: 'Lerato\'s Mathematics Progress', body: 'Good day Mr Dlamini, I wanted to discuss Lerato\'s excellent progress in Mathematics this term.', type: 'message', priority: 'normal', isRead: true, attachments: [], createdAt: '2025-03-19T11:00:00Z' },
  { id: 'm3', senderId: 'u1', sender: mockUsers[0], recipientIds: ['u3', 'u7'], subject: 'School Closure - Load Shedding', body: 'Please note the school will close early tomorrow due to Stage 6 load shedding.', type: 'alert', priority: 'urgent', isRead: false, attachments: [], createdAt: '2025-03-21T16:00:00Z' },
];

export const mockNotifications: Notification[] = [
  { id: 'n1', userId: 'u3', title: 'Invoice Due', message: 'Invoice INV-2025-002 is due on 1 April 2025', type: 'warning', isRead: false, link: '/parent/fees', createdAt: '2025-03-22T08:00:00Z' },
  { id: 'n2', userId: 'u3', title: 'Homework Graded', message: 'Lerato\'s Maths homework has been graded: 85%', type: 'success', isRead: false, link: '/parent/academics', createdAt: '2025-03-24T10:00:00Z' },
  { id: 'n3', userId: 'u3', title: 'Event Reminder', message: 'Inter-house Athletics Day is this Friday', type: 'info', isRead: true, link: '/parent/events', createdAt: '2025-03-23T07:00:00Z' },
];

// ============== Events ==============
export const mockEvents: SchoolEvent[] = [
  { id: 'e1', title: 'Inter-house Athletics Day', description: 'Annual inter-house athletics competition at the school grounds.', type: 'sports', startDate: '2025-03-28T08:00:00Z', endDate: '2025-03-28T15:00:00Z', location: 'School Sports Ground', isAllDay: true, requiresConsent: true, maxAttendees: 500, createdBy: 'u1' },
  { id: 'e2', title: 'Parent-Teacher Meeting', description: 'Term 1 parent-teacher conferences.', type: 'meeting', startDate: '2025-04-02T14:00:00Z', endDate: '2025-04-02T18:00:00Z', location: 'School Hall', isAllDay: false, requiresConsent: false, createdBy: 'u1' },
  { id: 'e3', title: 'Science Fair', description: 'Annual science fair showcasing student projects.', type: 'academic', startDate: '2025-04-15T09:00:00Z', endDate: '2025-04-15T14:00:00Z', location: 'School Hall', isAllDay: false, requiresConsent: false, ticketPrice: 5000, maxAttendees: 200, createdBy: 'u1' },
  { id: 'e4', title: 'Heritage Day Celebration', description: 'Celebrating South African heritage with food, music, and dance.', type: 'cultural', startDate: '2025-09-24T09:00:00Z', endDate: '2025-09-24T13:00:00Z', location: 'School Grounds', isAllDay: true, requiresConsent: false, createdBy: 'u1' },
];

// ============== Transport ==============
export const mockTransportRoutes: TransportRoute[] = [
  { id: 'tr1', name: 'Route A - Centurion', description: 'Centurion to Greenfield Academy', driverId: 'd1', driverName: 'Patrick Ndlovu', driverPhone: '079 123 4567', vehicleReg: 'GP 123 ABC', stops: [{ id: 'ts1', name: 'Centurion Mall', address: 'Centurion Mall, Centurion', time: '06:30', order: 1 }, { id: 'ts2', name: 'Irene Village', address: 'Irene Village Mall', time: '06:45', order: 2 }, { id: 'ts3', name: 'Greenfield Academy', address: '45 Jacaranda Ave', time: '07:15', order: 3 }], studentIds: ['st1', 'st3', 'st5'], isActive: true },
  { id: 'tr2', name: 'Route B - Hatfield', description: 'Hatfield to Greenfield Academy', driverId: 'd2', driverName: 'Samuel Pretorius', driverPhone: '082 987 6543', vehicleReg: 'GP 456 DEF', stops: [{ id: 'ts4', name: 'Hatfield Plaza', address: 'Hatfield Plaza, Hatfield', time: '06:45', order: 1 }, { id: 'ts5', name: 'Brooklyn Mall', address: 'Brooklyn Mall', time: '07:00', order: 2 }, { id: 'ts6', name: 'Greenfield Academy', address: '45 Jacaranda Ave', time: '07:20', order: 3 }], studentIds: ['st2', 'st4'], isActive: true },
];

// ============== Library ==============
export const mockBooks: LibraryBook[] = [
  { id: 'b1', title: 'Long Walk to Freedom', author: 'Nelson Mandela', isbn: '978-0316548182', category: 'Biography', totalCopies: 5, availableCopies: 3, location: 'Section A, Shelf 2' },
  { id: 'b2', title: 'Cry, the Beloved Country', author: 'Alan Paton', isbn: '978-0743262170', category: 'Fiction', totalCopies: 8, availableCopies: 5, location: 'Section B, Shelf 1' },
  { id: 'b3', title: 'Born a Crime', author: 'Trevor Noah', isbn: '978-0399588174', category: 'Autobiography', totalCopies: 4, availableCopies: 1, location: 'Section A, Shelf 3' },
  { id: 'b4', title: 'Mathematics Grade 8 Textbook', author: 'Dept of Education', isbn: '978-1234567890', category: 'Textbook', totalCopies: 35, availableCopies: 2, location: 'Section C, Shelf 1' },
  { id: 'b5', title: 'Physical Science Grade 8', author: 'Dept of Education', isbn: '978-0987654321', category: 'Textbook', totalCopies: 35, availableCopies: 5, location: 'Section C, Shelf 2' },
];

export const mockBorrowings: BookBorrowing[] = [
  { id: 'bb1', bookId: 'b1', book: mockBooks[0], studentId: 'st1', student: mockStudents[0], borrowedDate: '2025-03-10', dueDate: '2025-03-24', status: 'borrowed' },
  { id: 'bb2', bookId: 'b3', book: mockBooks[2], studentId: 'st2', student: mockStudents[1], borrowedDate: '2025-03-01', dueDate: '2025-03-15', status: 'overdue' },
  { id: 'bb3', bookId: 'b2', book: mockBooks[1], studentId: 'st1', student: mockStudents[0], borrowedDate: '2025-02-15', dueDate: '2025-03-01', returnedDate: '2025-02-28', status: 'returned' },
];

// ============== Discipline ==============
export const mockDisciplineRecords: DisciplineRecord[] = [
  { id: 'dr1', studentId: 'st1', student: mockStudents[0], type: 'merit', category: 'Academic Excellence', points: 10, description: 'Outstanding Mathematics test result', reportedById: 'u2', reportedBy: mockUsers[1], date: '2025-03-15' },
  { id: 'dr2', studentId: 'st2', student: mockStudents[1], type: 'demerit', category: 'Late Arrival', points: 2, description: 'Late to morning assembly', reportedById: 'u2', reportedBy: mockUsers[1], date: '2025-03-18' },
  { id: 'dr3', studentId: 'st1', student: mockStudents[0], type: 'merit', category: 'Leadership', points: 5, description: 'Helped organize school event', reportedById: 'u6', reportedBy: mockUsers[5], date: '2025-03-20' },
];

// ============== Consent Forms ==============
export const mockConsentForms: ConsentForm[] = [
  { id: 'cf1', title: 'Athletics Day Consent', description: 'Consent for participation in Inter-house Athletics Day', eventId: 'e1', dueDate: '2025-03-27', status: 'pending', parentId: 'p1', studentId: 'st1' },
  { id: 'cf2', title: 'Science Fair Participation', description: 'Consent for participation in the annual Science Fair', eventId: 'e3', dueDate: '2025-04-10', status: 'pending', parentId: 'p1', studentId: 'st1' },
];

// ============== Achievements ==============
export const mockAchievements: Achievement[] = [
  { id: 'ach1', name: 'Maths Whiz', description: 'Score 90%+ on 3 consecutive maths tests', icon: '🧮', category: 'academic', points: 50 },
  { id: 'ach2', name: 'Bookworm', description: 'Read 10 library books in a term', icon: '📚', category: 'academic', points: 30 },
  { id: 'ach3', name: 'Sports Star', description: 'Win a medal at inter-house athletics', icon: '🏅', category: 'sports', points: 40 },
  { id: 'ach4', name: 'Perfect Attendance', description: '100% attendance for a full term', icon: '✨', category: 'special', points: 25 },
  { id: 'ach5', name: 'Team Leader', description: 'Lead a group project successfully', icon: '👑', category: 'leadership', points: 35 },
];

export const mockStudentAchievements: StudentAchievement[] = [
  { id: 'sa1', studentId: 'st1', achievementId: 'ach1', achievement: mockAchievements[0], awardedDate: '2025-03-15', awardedBy: 'u2' },
  { id: 'sa2', studentId: 'st1', achievementId: 'ach4', achievement: mockAchievements[3], awardedDate: '2025-03-20', awardedBy: 'u1' },
];

// ============== Debtor Report ==============
export const mockDebtors: DebtorEntry[] = [
  { parentId: 'p1', parentName: 'Sipho Dlamini', studentName: 'Lerato Dlamini', grade: 'Grade 8', totalOwed: 450000, current: 450000, days30: 0, days60: 0, days90: 0, days120Plus: 0, lastPaymentDate: '2025-02-28' },
  { parentId: 'p2', parentName: 'Zanele Mbeki', studentName: 'Themba Mbeki', grade: 'Grade 8', totalOwed: 900000, current: 300000, days30: 300000, days60: 300000, days90: 0, days120Plus: 0, lastPaymentDate: '2025-03-05' },
  { parentId: 'p3', parentName: 'John Mokoena', studentName: 'Kagiso Mokoena', grade: 'Grade 9', totalOwed: 1350000, current: 450000, days30: 450000, days60: 450000, days90: 0, days120Plus: 0 },
  { parentId: 'p4', parentName: 'Sarah Mthembu', studentName: 'Kabelo Mthembu', grade: 'Grade 10', totalOwed: 1800000, current: 450000, days30: 450000, days60: 450000, days90: 450000, days120Plus: 0, lastPaymentDate: '2024-12-15' },
];

// ============== Daily Sales ==============
export const mockDailySales: DailySalesSummary[] = Array.from({ length: 7 }, (_, i) => ({
  date: `2025-03-${String(22 - i).padStart(2, '0')}`,
  totalTransactions: 45 + Math.floor(Math.random() * 30),
  totalRevenue: 80000 + Math.floor(Math.random() * 40000),
  topItems: [
    { name: 'Chicken Pie', quantity: 15 + Math.floor(Math.random() * 10), revenue: 37500 },
    { name: 'Fruit Juice', quantity: 20 + Math.floor(Math.random() * 15), revenue: 24000 },
    { name: 'Sandwich', quantity: 10 + Math.floor(Math.random() * 8), revenue: 20000 },
  ],
  averageTransaction: 1800 + Math.floor(Math.random() * 500),
}));

// ============== Dashboard Stats ==============
export const mockAdminStats: DashboardStats = {
  totalStudents: 342,
  totalStaff: 28,
  revenueCollected: 125400000,
  collectionRate: 87,
  attendanceRate: 94,
  outstandingFees: 18600000,
  walletBalance: 4520000,
};

// ============== Chart Data ==============
export const mockRevenueData = [
  { month: 'Jan', collected: 12500000, outstanding: 3200000 },
  { month: 'Feb', collected: 14200000, outstanding: 2800000 },
  { month: 'Mar', collected: 13800000, outstanding: 3100000 },
  { month: 'Apr', collected: 11900000, outstanding: 4500000 },
  { month: 'May', collected: 15100000, outstanding: 2100000 },
  { month: 'Jun', collected: 14600000, outstanding: 2600000 },
];

export const mockAttendanceByGrade = [
  { grade: 'Gr 8', rate: 95 },
  { grade: 'Gr 9', rate: 92 },
  { grade: 'Gr 10', rate: 94 },
  { grade: 'Gr 11', rate: 91 },
  { grade: 'Gr 12', rate: 96 },
];

export const mockFeeStatusData = [
  { name: 'Paid', value: 62, color: '#10B981' },
  { name: 'Partial', value: 18, color: '#F59E0B' },
  { name: 'Overdue', value: 12, color: '#EF4444' },
  { name: 'Pending', value: 8, color: '#94A3B8' },
];

// ============== Super Admin: Tenants ==============
export const mockTenants: Tenant[] = [
  {
    id: 'ten1', name: 'Greenfield Academy', slug: 'greenfield-academy',
    status: 'active', tier: 'enterprise', studentCount: 342, mrr: 1499900,
    adminEmail: 'admin@greenfield.edu.za', adminName: 'Thabo Molefe',
    city: 'Pretoria', province: 'Gauteng',
    enabledModules: ['fees', 'wallet', 'tuckshop', 'transport', 'communication', 'events', 'library', 'discipline'],
    createdAt: '2024-01-15T00:00:00Z',
  },
  {
    id: 'ten2', name: 'Sunridge Primary School', slug: 'sunridge-primary',
    status: 'active', tier: 'growth', studentCount: 215, mrr: 799900,
    adminEmail: 'admin@sunridge.edu.za', adminName: 'Patricia van Wyk',
    city: 'Cape Town', province: 'Western Cape',
    enabledModules: ['fees', 'communication', 'events', 'wallet'],
    createdAt: '2024-03-01T00:00:00Z',
  },
  {
    id: 'ten3', name: 'Horizon High School', slug: 'horizon-high',
    status: 'trial', tier: 'starter', studentCount: 88, mrr: 0,
    adminEmail: 'admin@horizon.edu.za', adminName: 'Mpho Khumalo',
    city: 'Johannesburg', province: 'Gauteng',
    enabledModules: ['fees', 'communication'],
    createdAt: '2026-03-01T00:00:00Z',
    trialEndsAt: '2026-04-01T00:00:00Z',
  },
  {
    id: 'ten4', name: 'Riverside College', slug: 'riverside-college',
    status: 'active', tier: 'growth', studentCount: 178, mrr: 799900,
    adminEmail: 'admin@riverside.edu.za', adminName: 'Nomsa Dube',
    city: 'Durban', province: 'KwaZulu-Natal',
    enabledModules: ['fees', 'wallet', 'tuckshop', 'transport', 'events'],
    createdAt: '2024-06-15T00:00:00Z',
  },
  {
    id: 'ten5', name: 'Eastgate Academy', slug: 'eastgate-academy',
    status: 'suspended', tier: 'starter', studentCount: 120, mrr: 0,
    adminEmail: 'admin@eastgate.edu.za', adminName: 'George Nkosi',
    city: 'Port Elizabeth', province: 'Eastern Cape',
    enabledModules: ['fees'],
    createdAt: '2024-09-01T00:00:00Z',
  },
];

// ============== Super Admin: Platform Invoices ==============
export const mockPlatformInvoices: PlatformInvoice[] = [
  { id: 'pi1', invoiceNumber: 'CAMP-2026-001', tenantId: 'ten1', tenantName: 'Greenfield Academy', amount: 1499900, status: 'paid', tier: 'enterprise', issuedDate: '2026-03-01', dueDate: '2026-03-07', paidDate: '2026-03-04' },
  { id: 'pi2', invoiceNumber: 'CAMP-2026-002', tenantId: 'ten2', tenantName: 'Sunridge Primary School', amount: 799900, status: 'paid', tier: 'growth', issuedDate: '2026-03-01', dueDate: '2026-03-07', paidDate: '2026-03-06' },
  { id: 'pi3', invoiceNumber: 'CAMP-2026-003', tenantId: 'ten4', tenantName: 'Riverside College', amount: 799900, status: 'sent', tier: 'growth', issuedDate: '2026-03-01', dueDate: '2026-03-07' },
  { id: 'pi4', invoiceNumber: 'CAMP-2026-004', tenantId: 'ten5', tenantName: 'Eastgate Academy', amount: 299900, status: 'overdue', tier: 'starter', issuedDate: '2026-02-01', dueDate: '2026-02-07' },
  { id: 'pi5', invoiceNumber: 'CAMP-2026-005', tenantId: 'ten1', tenantName: 'Greenfield Academy', amount: 1499900, status: 'paid', tier: 'enterprise', issuedDate: '2026-02-01', dueDate: '2026-02-07', paidDate: '2026-02-03' },
  { id: 'pi6', invoiceNumber: 'CAMP-2026-006', tenantId: 'ten2', tenantName: 'Sunridge Primary School', amount: 799900, status: 'paid', tier: 'growth', issuedDate: '2026-02-01', dueDate: '2026-02-07', paidDate: '2026-02-05' },
];

// ============== Super Admin: Support Tickets ==============
const supportMessages1: SupportMessage[] = [
  { id: 'sm1', ticketId: 'tkt1', senderId: 'u1', senderName: 'Thabo Molefe', senderRole: 'tenant', body: 'Our fee module is not generating invoices correctly. When we try to create a bulk invoice run, the system hangs and nothing is generated.', createdAt: '2026-03-27T08:30:00Z' },
  { id: 'sm2', ticketId: 'tkt1', senderId: 'u9', senderName: 'Refilwe Sithole', senderRole: 'support', body: 'Hi Thabo, thanks for reaching out. Can you share which browser you are using and whether this started happening after the recent update?', createdAt: '2026-03-27T09:15:00Z' },
  { id: 'sm3', ticketId: 'tkt1', senderId: 'u1', senderName: 'Thabo Molefe', senderRole: 'tenant', body: 'We are using Chrome 122. It started yesterday after we updated to version 2.4.1.', createdAt: '2026-03-27T09:45:00Z' },
];

const supportMessages2: SupportMessage[] = [
  { id: 'sm4', ticketId: 'tkt2', senderId: 'pa1', senderName: 'Patricia van Wyk', senderRole: 'tenant', body: 'We need to add a new admin user but there is no option in settings to do so. Please advise.', createdAt: '2026-03-26T14:00:00Z' },
  { id: 'sm5', ticketId: 'tkt2', senderId: 'u9', senderName: 'Refilwe Sithole', senderRole: 'support', body: 'Hi Patricia, admin user creation is under Settings → Staff → Invite Admin. Let me know if you need a walkthrough.', createdAt: '2026-03-26T14:30:00Z' },
  { id: 'sm6', ticketId: 'tkt2', senderId: 'pa1', senderName: 'Patricia van Wyk', senderRole: 'tenant', body: 'Found it, thank you!', createdAt: '2026-03-26T15:00:00Z' },
];

const supportMessages3: SupportMessage[] = [
  { id: 'sm7', ticketId: 'tkt3', senderId: 'mk1', senderName: 'Mpho Khumalo', senderRole: 'tenant', body: 'We would like to upgrade from the trial to the Starter plan. How do we proceed?', createdAt: '2026-03-28T10:00:00Z' },
];

const supportMessages4: SupportMessage[] = [
  { id: 'sm8', ticketId: 'tkt4', senderId: 'nd1', senderName: 'Nomsa Dube', senderRole: 'tenant', body: 'Tuckshop POS is not connecting to the wallet module. Students scan their wristbands but the balance does not deduct.', createdAt: '2026-03-25T11:00:00Z' },
  { id: 'sm9', ticketId: 'tkt4', senderId: 'u9', senderName: 'Refilwe Sithole', senderRole: 'support', body: 'This looks like a config issue with your wallet gateway. I have flagged this to our engineering team — expect a fix within 24 hours.', createdAt: '2026-03-25T13:00:00Z' },
];

export const mockSupportTickets: SupportTicket[] = [
  { id: 'tkt1', ticketNumber: 'TKT-2026-0042', tenantId: 'ten1', tenantName: 'Greenfield Academy', subject: 'Bulk invoice generation hangs', status: 'in_progress', priority: 'high', category: 'Bug', createdAt: '2026-03-27T08:30:00Z', updatedAt: '2026-03-27T09:45:00Z', messages: supportMessages1, assignedTo: 'Refilwe Sithole' },
  { id: 'tkt2', ticketNumber: 'TKT-2026-0041', tenantId: 'ten2', tenantName: 'Sunridge Primary School', subject: 'Cannot add new admin user', status: 'resolved', priority: 'normal', category: 'How-to', createdAt: '2026-03-26T14:00:00Z', updatedAt: '2026-03-26T15:00:00Z', messages: supportMessages2 },
  { id: 'tkt3', ticketNumber: 'TKT-2026-0043', tenantId: 'ten3', tenantName: 'Horizon High School', subject: 'Upgrade from trial to Starter plan', status: 'open', priority: 'normal', category: 'Billing', createdAt: '2026-03-28T10:00:00Z', updatedAt: '2026-03-28T10:00:00Z', messages: supportMessages3 },
  { id: 'tkt4', ticketNumber: 'TKT-2026-0040', tenantId: 'ten4', tenantName: 'Riverside College', subject: 'Wallet deduction not working at tuckshop POS', status: 'in_progress', priority: 'urgent', category: 'Bug', createdAt: '2026-03-25T11:00:00Z', updatedAt: '2026-03-25T13:00:00Z', messages: supportMessages4, assignedTo: 'Engineering Team' },
];

// ============== Super Admin: Platform Stats ==============
export const mockPlatformStats: PlatformStats = {
  totalSchools: 5,
  totalStudents: 943,
  mrr: 309970000, // cents = R30,997.00 (combined active schools)
  arr: 3719640000,
  activeTrials: 1,
  outstanding: 1099800, // cents = Eastgate overdue
};

// ============== Super Admin: Chart Data ==============
export const mockPlatformRevenueTrend = [
  { month: 'Oct', mrr: 250000 },
  { month: 'Nov', mrr: 280000 },
  { month: 'Dec', mrr: 280000 },
  { month: 'Jan', mrr: 309970 },
  { month: 'Feb', mrr: 309970 },
  { month: 'Mar', mrr: 309970 },
];

export const mockSchoolsByTier = [
  { name: 'Enterprise', value: 1, color: '#2563EB' },
  { name: 'Growth', value: 2, color: '#10B981' },
  { name: 'Starter', value: 2, color: '#F59E0B' },
];

export const mockStudentGrowth = [
  { month: 'Oct', students: 720 },
  { month: 'Nov', students: 780 },
  { month: 'Dec', students: 800 },
  { month: 'Jan', students: 850 },
  { month: 'Feb', students: 900 },
  { month: 'Mar', students: 943 },
];

// Lost & Found mock data
export const mockFoundItems: FoundItem[] = [
  {
    id: 'fi-1',
    name: 'Blue School Jacket',
    description: 'Navy blue school jacket with name tag partially removed. Size 10-11.',
    category: 'clothing',
    location: 'Sports Field',
    photoUrl: 'https://placehold.co/200x200/1e40af/fff?text=Jacket',
    dateFound: '2026-03-25',
    status: 'unclaimed',
    reportedBy: 'Mr. Williams',
  },
  {
    id: 'fi-2',
    name: 'Pink Lunch Box',
    description: 'Pink insulated lunch box with unicorn stickers on the lid.',
    category: 'lunch_box',
    location: 'Grade 3 Classroom',
    photoUrl: 'https://placehold.co/200x200/db2777/fff?text=Lunchbox',
    dateFound: '2026-03-24',
    status: 'claimed',
    reportedBy: 'Mrs. Naidoo',
    claimedBy: 'Sarah Johnson (Parent)',
    claimedDate: '2026-03-26',
  },
  {
    id: 'fi-3',
    name: 'Pencil Case with Markers',
    description: 'Clear zip-lock pencil case containing 12 coloured markers and 2 pens.',
    category: 'stationery',
    location: 'Library',
    photoUrl: 'https://placehold.co/200x200/059669/fff?text=Pencils',
    dateFound: '2026-03-22',
    status: 'unclaimed',
    reportedBy: 'Ms. Pillay',
  },
  {
    id: 'fi-4',
    name: 'Black School Shoes',
    description: 'Pair of black leather school shoes, size 4. Velcro straps.',
    category: 'clothing',
    location: 'Swimming Pool Area',
    photoUrl: 'https://placehold.co/200x200/1f2937/fff?text=Shoes',
    dateFound: '2026-03-20',
    status: 'matched',
    reportedBy: 'Mr. du Plessis',
    matchedReportId: 'lr-1',
  },
  {
    id: 'fi-5',
    name: 'Green Water Bottle',
    description: 'Large green water bottle with "Campusly Athletics" branding.',
    category: 'other',
    location: 'Main Hall',
    photoUrl: 'https://placehold.co/200x200/16a34a/fff?text=Bottle',
    dateFound: '2026-03-18',
    status: 'unclaimed',
    reportedBy: 'Mrs. van der Merwe',
  },
  {
    id: 'fi-6',
    name: 'Red Backpack',
    description: 'Small red backpack with cartoon print. Contains a jersey and snack box.',
    category: 'bags',
    location: 'Parking Lot',
    photoUrl: 'https://placehold.co/200x200/dc2626/fff?text=Backpack',
    dateFound: '2026-03-15',
    status: 'archived',
    reportedBy: 'Security Guard',
  },
  {
    id: 'fi-7',
    name: 'Calculator (Casio)',
    description: 'Casio fx-82ZA scientific calculator. Screen has a small scratch.',
    category: 'stationery',
    location: 'Grade 10 Maths Class',
    photoUrl: 'https://placehold.co/200x200/7c3aed/fff?text=Calc',
    dateFound: '2026-03-27',
    status: 'unclaimed',
    reportedBy: 'Mr. Mokoena',
  },
  {
    id: 'fi-8',
    name: 'Superman Lunch Bag',
    description: 'Insulated lunch bag with Superman print. Contains a juice box (expired).',
    category: 'lunch_box',
    location: 'Tuck Shop Counter',
    photoUrl: 'https://placehold.co/200x200/0ea5e9/fff?text=LunchBag',
    dateFound: '2026-03-26',
    status: 'matched',
    reportedBy: 'Tuck Shop Staff',
    matchedReportId: 'lr-3',
  },
];

export const mockLostReports: LostReport[] = [
  {
    id: 'lr-1',
    studentId: 'student-1',
    studentName: 'Thabo Mokoena',
    parentId: 'parent-1',
    parentName: 'James Mokoena',
    itemName: 'Black School Shoes',
    description: 'Size 4 black school shoes with velcro straps. Lost after swimming lesson.',
    category: 'clothing',
    locationLost: 'Swimming Pool Area',
    dateLost: '2026-03-19',
    status: 'matched',
    matchedItemId: 'fi-4',
    createdAt: '2026-03-20',
  },
  {
    id: 'lr-2',
    studentId: 'student-2',
    studentName: 'Amahle Dlamini',
    parentId: 'parent-2',
    parentName: 'Nomvula Dlamini',
    itemName: 'Blue Pencil Case',
    description: 'Blue denim pencil case with embroidered name "Amahle". Contains ruler and eraser.',
    category: 'stationery',
    locationLost: 'Playground',
    dateLost: '2026-03-23',
    status: 'open',
    createdAt: '2026-03-24',
  },
  {
    id: 'lr-3',
    studentId: 'student-3',
    studentName: 'Liam van Wyk',
    parentId: 'parent-3',
    parentName: 'Chantal van Wyk',
    itemName: 'Superman Lunch Bag',
    description: 'Insulated lunch bag with Superman print. Has name label inside.',
    category: 'lunch_box',
    locationLost: 'Tuck Shop',
    dateLost: '2026-03-25',
    status: 'matched',
    matchedItemId: 'fi-8',
    createdAt: '2026-03-26',
  },
];
