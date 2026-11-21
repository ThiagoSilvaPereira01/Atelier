export type ThemeMode = 'pastel' | 'light' | 'dark';

export type TabId =
  | 'inicio'
  | 'agenda'
  | 'estudos'
  | 'tarefas'
  | 'financeiro'
  | 'perfil'
  | 'ajustes';

export type EventCategory = 'Faculdade' | 'Estágio' | 'Supervisão' | 'Pessoal';

export interface AgendaEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  category: EventCategory;
  location?: string;
  notes?: string;
}

export type TaskCategory = 'Faculdade' | 'Monitoria' | 'Pessoal';
export type TaskPriority = 'alta' | 'media' | 'baixa';

export interface TaskItem {
  id: string;
  title: string;
  completed: boolean;
  category: TaskCategory;
  priority: TaskPriority;
  dueDate?: string; // YYYY-MM-DD
  isReminder?: boolean;
  notes?: string;
}

export type TransactionType = 'entrada' | 'saida' | 'receber';

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: string; // YYYY-MM-DD
  paymentMethod?: string;
  notes?: string;
}

export interface Course {
  id: string;
  name: string;
  semester: string;
  professor: string;
  progress: number; // 0-100
  absences: number;
  maxAbsences: number;
  nextExam?: string;
}

export type ReadingStatus = 'A ler' | 'Lendo' | 'Fichado';

export interface StudyReading {
  id: string;
  title: string;
  author: string;
  course: string;
  status: ReadingStatus;
  notes?: string;
}

export interface AppSettings {
  brandName: string;
  brandSubtitle: string;
  userName: string;
  theme: ThemeMode;
  hideFinancialValues: boolean;
  internshipHoursDone: number;
  internshipHoursTarget: number;
  mobileFavorites?: TabId[];
  monthlyBudget?: number;
  profileRole?: string;
  profileCourse?: string;
  profileInstitution?: string;
  profileBio?: string;
  profileFocus?: string;
}

export interface AppData {
  settings: AppSettings;
  events: AgendaEvent[];
  tasks: TaskItem[];
  transactions: Transaction[];
  courses: Course[];
  readings: StudyReading[];
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}
