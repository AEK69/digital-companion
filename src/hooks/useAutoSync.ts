import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Employee, Income, Expense, Attendance, Leave } from '@/types';
import { prepareDataForSync } from '@/utils/exportUtils';
import { Sale } from '@/hooks/useSales';
import { Customer } from '@/hooks/useCustomers';

const SYNC_DEBOUNCE_MS = 5000;

interface UseAutoSyncProps {
  incomes: Income[];
  expenses: Expense[];
  attendances: Attendance[];
  leaves: Leave[];
  employees: Employee[];
  sales?: Sale[];
  customers?: Customer[];
  spreadsheetId: string | null;
  enabled: boolean;
}

export function useAutoSync({
  incomes,
  expenses,
  attendances,
  leaves,
  employees,
  sales = [],
  customers = [],
  spreadsheetId,
  enabled,
}: UseAutoSyncProps) {
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSyncingRef = useRef(false);
  const lastSyncRef = useRef<string>('');

  const syncToGoogleSheets = useCallback(async () => {
    if (!spreadsheetId || !enabled || isSyncingRef.current) return;

    const dataHash = JSON.stringify({
      incomes: incomes.length,
      expenses: expenses.length,
      attendances: attendances.length,
      leaves: leaves.length,
      employees: employees.length,
      sales: sales.length,
    });

    if (dataHash === lastSyncRef.current) return;

    isSyncingRef.current = true;

    try {
      // Fetch sale items for current sales
      let saleItems: any[] = [];
      if (sales.length > 0) {
        const { data } = await supabase
          .from('sale_items')
          .select('*')
          .in('sale_id', sales.map(s => s.id));
        saleItems = data || [];
      }

      const data = prepareDataForSync(
        incomes, 
        expenses, 
        attendances, 
        leaves, 
        employees,
        sales,
        saleItems,
        customers
      );

      const { data: result, error } = await supabase.functions.invoke('sync-google-sheets', {
        body: { spreadsheetId, data },
      });

      if (error) throw error;

      if (result?.success) {
        lastSyncRef.current = dataHash;
        console.log('Auto-sync completed successfully');
      } else {
        throw new Error(result?.error || 'Sync failed');
      }
    } catch (error: any) {
      console.error('Auto-sync error:', error);
    } finally {
      isSyncingRef.current = false;
    }
  }, [incomes, expenses, attendances, leaves, employees, sales, customers, spreadsheetId, enabled]);

  const triggerSync = useCallback(() => {
    if (!spreadsheetId || !enabled) return;

    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(() => {
      syncToGoogleSheets();
    }, SYNC_DEBOUNCE_MS);
  }, [spreadsheetId, enabled, syncToGoogleSheets]);

  return { triggerSync, syncNow: syncToGoogleSheets };
}
