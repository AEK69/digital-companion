import { useState, useCallback } from 'react';
import { LoginScreen } from '@/components/LoginScreen';
import { Header } from '@/components/Header';
import { Navigation } from '@/components/Navigation';
import { AttendanceTab } from '@/components/AttendanceTab';
import { IncomeTab } from '@/components/IncomeTab';
import { ExpenseTab } from '@/components/ExpenseTab';
import { HistoryTab } from '@/components/HistoryTab';
import { LeaveTab } from '@/components/LeaveTab';
import { DailyReportTab } from '@/components/DailyReportTab';
import { SummaryTab } from '@/components/SummaryTab';
import { SettingsTab } from '@/components/SettingsTab';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Employee, Attendance, Income, Expense, Leave, StoreInfo, TabType } from '@/types';
import { toast } from 'sonner';

const CORRECT_PASSWORD = '2001';

const defaultStoreInfo: StoreInfo = {
  name: 'KY SKIN',
};

const defaultEmployees: Employee[] = [
  { id: '1', name: 'ສົມໃຈ', hourlyRate: 15000 },
  { id: '2', name: 'ນ້ອຍໜຶ່ງ', hourlyRate: 15000 },
];

const Index = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('attendance');

  // Data storage
  const [storeInfo, setStoreInfo] = useLocalStorage<StoreInfo>('ky-store-info', defaultStoreInfo);
  const [employees, setEmployees] = useLocalStorage<Employee[]>('ky-employees', defaultEmployees);
  const [attendances, setAttendances] = useLocalStorage<Attendance[]>('ky-attendances', []);
  const [incomes, setIncomes] = useLocalStorage<Income[]>('ky-incomes', []);
  const [expenses, setExpenses] = useLocalStorage<Expense[]>('ky-expenses', []);
  const [leaves, setLeaves] = useLocalStorage<Leave[]>('ky-leaves', []);

  // Generate unique ID
  const generateId = () => Math.random().toString(36).substr(2, 9);

  // Clock In/Out handlers
  const handleClockIn = useCallback((employeeId: string, manualTime?: string) => {
    const today = new Date().toISOString().split('T')[0];
    const time = manualTime || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    
    setAttendances((prev) => [
      ...prev,
      {
        id: generateId(),
        employeeId,
        date: today,
        clockIn: time,
        hours: 0,
        wage: 0,
        bonus: 0,
        total: 0,
      },
    ]);
    toast.success('ບັນທຶກເຂົ້າວຽກສຳເລັດ');
  }, [setAttendances]);

  const handleClockOut = useCallback((employeeId: string, manualTime?: string) => {
    const today = new Date().toISOString().split('T')[0];
    const time = manualTime || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    
    setAttendances((prev) =>
      prev.map((att) => {
        if (att.employeeId === employeeId && att.date === today && !att.clockOut) {
          const employee = employees.find((e) => e.id === employeeId);
          const clockInTime = att.clockIn?.split(':').map(Number) || [0, 0];
          const clockOutTime = time.split(':').map(Number);
          const hours = (clockOutTime[0] - clockInTime[0]) + (clockOutTime[1] - clockInTime[1]) / 60;
          const wage = Math.max(0, hours) * (employee?.hourlyRate || 0);
          
          return {
            ...att,
            clockOut: time,
            hours: Math.max(0, hours),
            wage,
            total: wage,
          };
        }
        return att;
      })
    );
    toast.success('ບັນທຶກອອກວຽກສຳເລັດ');
  }, [employees, setAttendances]);

  // Income handlers
  const handleAddIncome = useCallback((income: Omit<Income, 'id'>) => {
    setIncomes((prev) => [...prev, { ...income, id: generateId() }]);
    toast.success('ບັນທຶກລາຍຮັບສຳເລັດ');
  }, [setIncomes]);

  const handleDeleteIncome = useCallback((id: string) => {
    setIncomes((prev) => prev.filter((i) => i.id !== id));
    toast.success('ລຶບລາຍຮັບສຳເລັດ');
  }, [setIncomes]);

  // Expense handlers
  const handleAddExpense = useCallback((expense: Omit<Expense, 'id'>) => {
    setExpenses((prev) => [...prev, { ...expense, id: generateId() }]);
    toast.success('ບັນທຶກລາຍຈ່າຍສຳເລັດ');
  }, [setExpenses]);

  const handleDeleteExpense = useCallback((id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    toast.success('ລຶບລາຍຈ່າຍສຳເລັດ');
  }, [setExpenses]);

  // Leave handlers
  const handleAddLeave = useCallback((leave: Omit<Leave, 'id'>) => {
    setLeaves((prev) => [...prev, { ...leave, id: generateId() }]);
    toast.success('ບັນທຶກການລາສຳເລັດ');
  }, [setLeaves]);

  const handleDeleteLeave = useCallback((id: string) => {
    setLeaves((prev) => prev.filter((l) => l.id !== id));
    toast.success('ລຶບການລາສຳເລັດ');
  }, [setLeaves]);

  // Employee handlers
  const handleAddEmployee = useCallback((employee: Omit<Employee, 'id'>) => {
    setEmployees((prev) => [...prev, { ...employee, id: generateId() }]);
    toast.success('ເພີ່ມພະນັກງານສຳເລັດ');
  }, [setEmployees]);

  const handleDeleteEmployee = useCallback((id: string) => {
    setEmployees((prev) => prev.filter((e) => e.id !== id));
    toast.success('ລຶບພະນັກງານສຳເລັດ');
  }, [setEmployees]);

  // Data export/import
  const handleExportData = useCallback(() => {
    const data = {
      storeInfo,
      employees,
      attendances,
      incomes,
      expenses,
      leaves,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ky-skin-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('ສົ່ງອອກຂໍ້ມູນສຳເລັດ');
  }, [storeInfo, employees, attendances, incomes, expenses, leaves]);

  const handleImportData = useCallback((dataStr: string) => {
    try {
      const data = JSON.parse(dataStr);
      if (data.storeInfo) setStoreInfo(data.storeInfo);
      if (data.employees) setEmployees(data.employees);
      if (data.attendances) setAttendances(data.attendances);
      if (data.incomes) setIncomes(data.incomes);
      if (data.expenses) setExpenses(data.expenses);
      if (data.leaves) setLeaves(data.leaves);
      toast.success('ນຳເຂົ້າຂໍ້ມູນສຳເລັດ');
    } catch (error) {
      toast.error('ເກີດຂໍ້ຜິດພາດໃນການນຳເຂົ້າຂໍ້ມູນ');
    }
  }, [setStoreInfo, setEmployees, setAttendances, setIncomes, setExpenses, setLeaves]);

  const handleClearAllData = useCallback(() => {
    setAttendances([]);
    setIncomes([]);
    setExpenses([]);
    setLeaves([]);
    toast.success('ລຶບຂໍ້ມູນທັງໝົດສຳເລັດ');
  }, [setAttendances, setIncomes, setExpenses, setLeaves]);

  // Render login screen if not authenticated
  if (!isAuthenticated) {
    return <LoginScreen onLogin={() => setIsAuthenticated(true)} correctPassword={CORRECT_PASSWORD} />;
  }

  return (
    <div className="min-h-screen">
      <Header onLogout={() => setIsAuthenticated(false)} />
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="container mx-auto px-4 py-6">
        {activeTab === 'attendance' && (
          <AttendanceTab
            employees={employees}
            attendances={attendances}
            onClockIn={handleClockIn}
            onClockOut={handleClockOut}
          />
        )}
        {activeTab === 'income' && (
          <IncomeTab
            employees={employees}
            incomes={incomes}
            onAddIncome={handleAddIncome}
            onDeleteIncome={handleDeleteIncome}
          />
        )}
        {activeTab === 'expense' && (
          <ExpenseTab
            employees={employees}
            expenses={expenses}
            onAddExpense={handleAddExpense}
            onDeleteExpense={handleDeleteExpense}
          />
        )}
        {activeTab === 'history' && (
          <HistoryTab incomes={incomes} expenses={expenses} employees={employees} />
        )}
        {activeTab === 'leave' && (
          <LeaveTab
            employees={employees}
            leaves={leaves}
            onAddLeave={handleAddLeave}
            onDeleteLeave={handleDeleteLeave}
          />
        )}
        {activeTab === 'daily' && (
          <DailyReportTab employees={employees} attendances={attendances} />
        )}
        {activeTab === 'summary' && (
          <SummaryTab incomes={incomes} expenses={expenses} attendances={attendances} />
        )}
        {activeTab === 'settings' && (
          <SettingsTab
            storeInfo={storeInfo}
            employees={employees}
            onUpdateStoreInfo={setStoreInfo}
            onAddEmployee={handleAddEmployee}
            onDeleteEmployee={handleDeleteEmployee}
            onExportData={handleExportData}
            onImportData={handleImportData}
            onClearAllData={handleClearAllData}
          />
        )}
      </main>
    </div>
  );
};

export default Index;
