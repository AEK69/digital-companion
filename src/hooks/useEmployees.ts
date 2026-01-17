import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Employee } from '@/types';
import { toast } from 'sonner';

export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch employees
  const fetchEmployees = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      setEmployees(
        (data || []).map(emp => ({
          id: emp.id,
          name: emp.name,
          avatar: emp.avatar || undefined,
          hourlyRate: Number(emp.hourly_rate),
        }))
      );
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Add employee
  const addEmployee = useCallback(async (employee: Omit<Employee, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .insert([{
          name: employee.name,
          avatar: employee.avatar || null,
          hourly_rate: employee.hourlyRate,
        }])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setEmployees(prev => [...prev, {
          id: data.id,
          name: data.name,
          avatar: data.avatar || undefined,
          hourlyRate: Number(data.hourly_rate),
        }]);
        toast.success('ເພີ່ມພະນັກງານສຳເລັດ');
      }
    } catch (error) {
      console.error('Error adding employee:', error);
      toast.error('ເກີດຂໍ້ຜິດພາດໃນການເພີ່ມພະນັກງານ');
    }
  }, []);

  // Delete employee
  const deleteEmployee = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setEmployees(prev => prev.filter(e => e.id !== id));
      toast.success('ລຶບພະນັກງານສຳເລັດ');
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast.error('ເກີດຂໍ້ຜິດພາດໃນການລຶບພະນັກງານ');
    }
  }, []);

  // Update employee
  const updateEmployee = useCallback(async (id: string, updates: Partial<Omit<Employee, 'id'>>) => {
    try {
      const dbUpdates: Record<string, any> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.avatar !== undefined) dbUpdates.avatar = updates.avatar || null;
      if (updates.hourlyRate !== undefined) dbUpdates.hourly_rate = updates.hourlyRate;

      const { error } = await supabase
        .from('employees')
        .update(dbUpdates)
        .eq('id', id);

      if (error) throw error;

      setEmployees(prev => prev.map(e => 
        e.id === id ? { ...e, ...updates } : e
      ));
      toast.success('ອັບເດດພະນັກງານສຳເລັດ');
    } catch (error) {
      console.error('Error updating employee:', error);
      toast.error('ເກີດຂໍ້ຜິດພາດໃນການອັບເດດ');
    }
  }, []);

  return {
    employees,
    loading,
    addEmployee,
    deleteEmployee,
    updateEmployee,
    refetch: fetchEmployees,
  };
}
