import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Expense } from '@/types';
import { toast } from 'sonner';

interface DbExpense {
  id: string;
  date: string;
  employee_id: string | null;
  amount: number;
  type: string;
  payment_method: string;
  description: string | null;
}

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExpenses = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;

      setExpenses(
        (data || []).map((exp: DbExpense) => ({
          id: exp.id,
          date: exp.date,
          employeeId: exp.employee_id || '',
          amount: Number(exp.amount),
          type: exp.type,
          paymentMethod: exp.payment_method,
          description: exp.description || '',
        }))
      );
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const addExpense = useCallback(async (expense: Omit<Expense, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .insert([{
          date: expense.date,
          employee_id: expense.employeeId || null,
          amount: expense.amount,
          type: expense.type,
          payment_method: expense.paymentMethod,
          description: expense.description || null,
        }])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const newExpense: Expense = {
          id: data.id,
          date: data.date,
          employeeId: data.employee_id || '',
          amount: Number(data.amount),
          type: data.type,
          paymentMethod: data.payment_method,
          description: data.description || '',
        };
        setExpenses(prev => [newExpense, ...prev]);
        toast.success('ບັນທຶກລາຍຈ່າຍສຳເລັດ');
      }
    } catch (error) {
      console.error('Error adding expense:', error);
      toast.error('ເກີດຂໍ້ຜິດພາດໃນການບັນທຶກ');
    }
  }, []);

  const deleteExpense = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setExpenses(prev => prev.filter(e => e.id !== id));
      toast.success('ລຶບລາຍຈ່າຍສຳເລັດ');
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('ເກີດຂໍ້ຜິດພາດໃນການລຶບ');
    }
  }, []);

  return {
    expenses,
    loading,
    addExpense,
    deleteExpense,
    refetch: fetchExpenses,
  };
}
