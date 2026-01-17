import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Income } from '@/types';
import { toast } from 'sonner';

interface DbIncome {
  id: string;
  date: string;
  employee_id: string;
  amount: number;
  cost: number;
  type: string;
  payment_method: string;
  description: string | null;
}

export function useIncomes() {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchIncomes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('incomes')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;

      setIncomes(
        (data || []).map((inc: DbIncome) => ({
          id: inc.id,
          date: inc.date,
          employeeId: inc.employee_id,
          amount: Number(inc.amount),
          cost: Number(inc.cost),
          type: inc.type as 'service' | 'sale',
          paymentMethod: inc.payment_method,
          description: inc.description || '',
        }))
      );
    } catch (error) {
      console.error('Error fetching incomes:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIncomes();
  }, [fetchIncomes]);

  const addIncome = useCallback(async (income: Omit<Income, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('incomes')
        .insert([{
          date: income.date,
          employee_id: income.employeeId,
          amount: income.amount,
          cost: income.cost,
          type: income.type,
          payment_method: income.paymentMethod,
          description: income.description || null,
        }])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const newIncome: Income = {
          id: data.id,
          date: data.date,
          employeeId: data.employee_id,
          amount: Number(data.amount),
          cost: Number(data.cost),
          type: data.type as 'service' | 'sale',
          paymentMethod: data.payment_method,
          description: data.description || '',
        };
        setIncomes(prev => [newIncome, ...prev]);
        toast.success('ບັນທຶກລາຍຮັບສຳເລັດ');
      }
    } catch (error) {
      console.error('Error adding income:', error);
      toast.error('ເກີດຂໍ້ຜິດພາດໃນການບັນທຶກ');
    }
  }, []);

  const deleteIncome = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('incomes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setIncomes(prev => prev.filter(i => i.id !== id));
      toast.success('ລຶບລາຍຮັບສຳເລັດ');
    } catch (error) {
      console.error('Error deleting income:', error);
      toast.error('ເກີດຂໍ້ຜິດພາດໃນການລຶບ');
    }
  }, []);

  return {
    incomes,
    loading,
    addIncome,
    deleteIncome,
    refetch: fetchIncomes,
  };
}
