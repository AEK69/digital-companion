import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
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
import { PrintReportsTab } from '@/components/PrintReportsTab';
import { ExportDataTab } from '@/components/ExportDataTab';
import { UserManagementTab } from '@/components/UserManagementTab';
import { POSTab } from '@/components/pos/POSTab';
import { ProductsManagementTab } from '@/components/pos/ProductsManagementTab';
import { InventoryTab } from '@/components/pos/InventoryTab';
import { SalesReportTab } from '@/components/pos/SalesReportTab';
import { CustomersTab } from '@/components/pos/CustomersTab';
import { ReorderReportTab } from '@/components/pos/ReorderReportTab';
import { DashboardTab } from '@/components/pos/DashboardTab';
import { PromotionsTab } from '@/components/pos/PromotionsTab';
import { useProducts } from '@/hooks/useProducts';
import { useSales } from '@/hooks/useSales';
import { useCustomers } from '@/hooks/useCustomers';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { useAutoSync } from '@/hooks/useAutoSync';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { useEmployees } from '@/hooks/useEmployees';
import { useIncomes } from '@/hooks/useIncomes';
import { useExpenses } from '@/hooks/useExpenses';
import { useAttendances } from '@/hooks/useAttendances';
import { useLeaves } from '@/hooks/useLeaves';
import { TabType, StoreInfo } from '@/types';

const Index = () => {
  const { user, role, profile, loading: authLoading, permissions, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('pos');

  // Database hooks
  const { storeSettings, loading: settingsLoading, updateSettings } = useStoreSettings();
  const { employees, loading: employeesLoading, addEmployee, deleteEmployee } = useEmployees();
  const { incomes, addIncome, deleteIncome } = useIncomes();
  const { expenses, addExpense, deleteExpense } = useExpenses();
  const { attendances, clockIn, clockOut } = useAttendances(employees);
  const { leaves, addLeave, deleteLeave } = useLeaves();
  const { products } = useProducts();
  const { sales } = useSales();
  const { customers } = useCustomers();

  // Convert store settings to StoreInfo format
  const storeInfo: StoreInfo = {
    name: storeSettings.name,
    logo: storeSettings.logo,
    address: storeSettings.address,
    phone: storeSettings.phone,
  };

  // Notifications hook
  useNotifications({ incomes, expenses, employees });

  // Auto-sync hook
  const { triggerSync } = useAutoSync({
    incomes,
    expenses,
    attendances,
    leaves,
    employees,
    sales,
    customers,
    spreadsheetId: storeSettings.googleSpreadsheetId,
    enabled: storeSettings.autoSyncEnabled,
  });

  // Trigger sync when data changes (including sales)
  useEffect(() => {
    if (storeSettings.autoSyncEnabled && storeSettings.googleSpreadsheetId) {
      triggerSync();
    }
  }, [incomes, expenses, attendances, leaves, employees, sales, storeSettings.autoSyncEnabled, storeSettings.googleSpreadsheetId, triggerSync]);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Clock In/Out handlers (wrapper for database hooks)
  const handleClockIn = useCallback((employeeId: string, manualTime?: string) => {
    clockIn(employeeId, manualTime);
  }, [clockIn]);

  const handleClockOut = useCallback((employeeId: string, manualTime?: string) => {
    clockOut(employeeId, manualTime);
  }, [clockOut]);

  // Store info update handler
  const handleUpdateStoreInfo = useCallback((info: StoreInfo) => {
    updateSettings({
      name: info.name,
      logo: info.logo,
      address: info.address,
      phone: info.phone,
    });
  }, [updateSettings]);

  // Auto-sync settings change handler
  const handleAutoSyncSettingsChange = useCallback((spreadsheetId: string | null, enabled: boolean) => {
    updateSettings({
      googleSpreadsheetId: spreadsheetId,
      autoSyncEnabled: enabled,
    });
  }, [updateSettings]);

  // Data export
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
  }, [storeInfo, employees, attendances, incomes, expenses, leaves]);

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  // Loading state
  const isLoading = authLoading || settingsLoading || employeesLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <Header 
        onLogout={handleLogout} 
        userRole={role} 
        userName={profile?.full_name}
        storeName={storeInfo.name}
        storeLogo={storeInfo.logo}
      />
      <Navigation 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        userRole={role} 
      />

      <main className="container mx-auto px-4 py-6">
        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'pos' && <POSTab employees={employees} storeInfo={storeInfo} onNavigateToInventory={() => setActiveTab('inventory')} />}
        {activeTab === 'products' && <ProductsManagementTab />}
        {activeTab === 'inventory' && <InventoryTab />}
        {activeTab === 'salesreport' && <SalesReportTab />}
        {activeTab === 'customers' && <CustomersTab />}
        {activeTab === 'promotions' && <PromotionsTab />}
        {activeTab === 'reorder' && <ReorderReportTab products={products} />}
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
            onAddIncome={addIncome}
            onDeleteIncome={deleteIncome}
            storeInfo={storeInfo}
            canEdit={permissions?.canEditFinance}
          />
        )}
        {activeTab === 'expense' && (
          <ExpenseTab
            employees={employees}
            expenses={expenses}
            onAddExpense={addExpense}
            onDeleteExpense={deleteExpense}
          />
        )}
        {activeTab === 'history' && (
          <HistoryTab incomes={incomes} expenses={expenses} employees={employees} />
        )}
        {activeTab === 'leave' && (
          <LeaveTab
            employees={employees}
            leaves={leaves}
            onAddLeave={addLeave}
            onDeleteLeave={deleteLeave}
          />
        )}
        {activeTab === 'daily' && (
          <DailyReportTab employees={employees} attendances={attendances} />
        )}
        {activeTab === 'summary' && (
          <SummaryTab incomes={incomes} expenses={expenses} attendances={attendances} />
        )}
        {activeTab === 'reports' && (
          <PrintReportsTab
            incomes={incomes}
            expenses={expenses}
            attendances={attendances}
            employees={employees}
            storeInfo={storeInfo}
          />
        )}
        {activeTab === 'export' && (
          <ExportDataTab
            incomes={incomes}
            expenses={expenses}
            attendances={attendances}
            leaves={leaves}
            employees={employees}
            autoSyncSpreadsheetId={storeSettings.googleSpreadsheetId}
            autoSyncEnabled={storeSettings.autoSyncEnabled}
            onAutoSyncSettingsChange={handleAutoSyncSettingsChange}
          />
        )}
        {activeTab === 'users' && <UserManagementTab />}
        {activeTab === 'settings' && (
          <SettingsTab
            storeInfo={storeInfo}
            employees={employees}
            onUpdateStoreInfo={handleUpdateStoreInfo}
            onAddEmployee={addEmployee}
            onDeleteEmployee={deleteEmployee}
            onExportData={handleExportData}
          />
        )}
      </main>
    </div>
  );
};

export default Index;
