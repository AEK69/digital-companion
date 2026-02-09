export interface Employee {
  id: string;
  name: string;
  avatar?: string;
  hourlyRate: number;
}

export interface Attendance {
  id: string;
  employeeId: string;
  date: string;
  clockIn?: string;
  clockOut?: string;
  hours: number;
  wage: number;
  bonus: number;
  total: number;
}

export interface Income {
  id: string;
  date: string;
  employeeId: string;
  amount: number;
  cost: number;
  type: 'service' | 'sale';
  paymentMethod: string;
  description: string;
}

export interface Expense {
  id: string;
  date: string;
  employeeId: string;
  amount: number;
  type: string;
  paymentMethod: string;
  description: string;
}

export interface Leave {
  id: string;
  employeeId: string;
  date: string;
  type: 'general' | 'vacation' | 'sick';
  reason?: string;
}

export interface StoreInfo {
  name: string;
  logo?: string;
  address?: string;
  phone?: string;
}

export type TabType = 'home' | 'dashboard' | 'attendance' | 'income' | 'expense' | 'history' | 'leave' | 'daily' | 'summary' | 'settings' | 'reports' | 'users' | 'export' | 'pos' | 'products' | 'inventory' | 'salesreport' | 'customers' | 'reorder' | 'promotions' | 'reservations' | 'credits';

// Auth & Roles
export type AppRole = 'admin' | 'finance' | 'staff';

export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

// Role permissions
export const ROLE_PERMISSIONS: Record<AppRole, {
  canManageEmployees: boolean;
  canManageRoles: boolean;
  canViewFinance: boolean;
  canEditFinance: boolean;
  canViewAttendance: boolean;
  canEditAttendance: boolean;
  canViewSettings: boolean;
  canExportData: boolean;
  canPrintReports: boolean;
}> = {
  admin: {
    canManageEmployees: true,
    canManageRoles: true,
    canViewFinance: true,
    canEditFinance: true,
    canViewAttendance: true,
    canEditAttendance: true,
    canViewSettings: true,
    canExportData: true,
    canPrintReports: true,
  },
  finance: {
    canManageEmployees: false,
    canManageRoles: false,
    canViewFinance: true,
    canEditFinance: true,
    canViewAttendance: true,
    canEditAttendance: false,
    canViewSettings: false,
    canExportData: true,
    canPrintReports: true,
  },
  staff: {
    canManageEmployees: false,
    canManageRoles: false,
    canViewFinance: false,
    canEditFinance: false,
    canViewAttendance: true,
    canEditAttendance: true,
    canViewSettings: false,
    canExportData: false,
    canPrintReports: false,
  },
};
