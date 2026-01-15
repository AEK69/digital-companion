import { useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { Income, Expense } from '@/types';

interface UseNotificationsProps {
  incomes: Income[];
  expenses: Expense[];
  employees: { id: string; name: string }[];
}

export function useNotifications({ incomes, expenses, employees }: UseNotificationsProps) {
  const prevIncomesLengthRef = useRef(incomes.length);
  const prevExpensesLengthRef = useRef(expenses.length);
  const isInitializedRef = useRef(false);

  const getEmployeeName = useCallback((employeeId: string) => {
    return employees.find(e => e.id === employeeId)?.name || 'ບໍ່ລະບຸ';
  }, [employees]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('lo-LA').format(amount) + ' ກີບ';
  };

  useEffect(() => {
    // Skip on initial mount
    if (!isInitializedRef.current) {
      prevIncomesLengthRef.current = incomes.length;
      prevExpensesLengthRef.current = expenses.length;
      isInitializedRef.current = true;
      return;
    }

    // Check for new income
    if (incomes.length > prevIncomesLengthRef.current) {
      const newIncome = incomes[incomes.length - 1];
      const employeeName = getEmployeeName(newIncome.employeeId);
      const profit = newIncome.amount - newIncome.cost;

      toast.success(
        `💰 ລາຍຮັບໃໝ່: ${formatCurrency(newIncome.amount)}`,
        {
          description: `ຈາກ ${employeeName} • ກຳໄລ: ${formatCurrency(profit)}`,
          duration: 5000,
        }
      );
    }

    prevIncomesLengthRef.current = incomes.length;
  }, [incomes, getEmployeeName]);

  useEffect(() => {
    // Skip on initial mount
    if (!isInitializedRef.current) {
      return;
    }

    // Check for new expense
    if (expenses.length > prevExpensesLengthRef.current) {
      const newExpense = expenses[expenses.length - 1];
      const employeeName = getEmployeeName(newExpense.employeeId);

      toast.info(
        `📤 ລາຍຈ່າຍໃໝ່: ${formatCurrency(newExpense.amount)}`,
        {
          description: `ໂດຍ ${employeeName} • ${newExpense.type}`,
          duration: 5000,
        }
      );
    }

    prevExpensesLengthRef.current = expenses.length;
  }, [expenses, getEmployeeName]);

  // Request browser notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Send browser notification
  const sendBrowserNotification = useCallback((title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
      });
    }
  }, []);

  return { sendBrowserNotification };
}
