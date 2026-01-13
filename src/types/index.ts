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

export type TabType = 'attendance' | 'income' | 'expense' | 'history' | 'leave' | 'daily' | 'summary' | 'settings';
