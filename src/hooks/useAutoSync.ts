import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Employee, Income, Expense, Attendance, Leave } from '@/types';
import { prepareDataForSync } from '@/utils/exportUtils';
import { toast } from 'sonner';

const SYNC_DEBOUNCE_MS = 5000; // Wait 5 seconds after last change before syncing

interface UseAutoSyncProps {
  incomes: Income[];
  expenses: Expense[];
  attendances: Attendance[];
  leaves: Leave[];
  employees: Employee[];
  spreadsheetId: string | null;
  enabled: boolean;
}

export function useAutoSync({
  incomes,
  expenses,
  attendances,
  leaves,
  employees,
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
    });

    // Skip if data hasn't changed
    if (dataHash === lastSyncRef.current) return;

    isSyncingRef.current = true;

    try {
      const data = prepareDataForSync(incomes, expenses, attendances, leaves, employees);

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
  }, [incomes, expenses, attendances, leaves, employees, spreadsheetId, enabled]);

  const triggerSync = useCallback(() => {
    if (!spreadsheetId || !enabled) return;

    // Clear existing timeout
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    // Set new timeout for debounced sync
    syncTimeoutRef.current = setTimeout(() => {
      syncToGoogleSheets();
    }, SYNC_DEBOUNCE_MS);
  }, [spreadsheetId, enabled, syncToGoogleSheets]);

  return { triggerSync, syncNow: syncToGoogleSheets };
}
