import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Leave } from '@/types';
import { toast } from 'sonner';

interface DbLeave {
  id: string;
  employee_id: string;
  date: string;
  type: string;
  reason: string | null;
}

export function useLeaves() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaves = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('leaves')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;

      setLeaves(
        (data || []).map((lv: DbLeave) => ({
          id: lv.id,
          employeeId: lv.employee_id,
          date: lv.date,
          type: lv.type as 'general' | 'vacation' | 'sick',
          reason: lv.reason || undefined,
        }))
      );
    } catch (error) {
      console.error('Error fetching leaves:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  const addLeave = useCallback(async (leave: Omit<Leave, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('leaves')
        .insert([{
          employee_id: leave.employeeId,
          date: leave.date,
          type: leave.type,
          reason: leave.reason || null,
        }])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const newLeave: Leave = {
          id: data.id,
          employeeId: data.employee_id,
          date: data.date,
          type: data.type as 'general' | 'vacation' | 'sick',
          reason: data.reason || undefined,
        };
        setLeaves(prev => [newLeave, ...prev]);
        toast.success('ບັນທຶກການລາສຳເລັດ');
      }
    } catch (error: any) {
      console.error('Error adding leave:', error);
      if (error.code === '23505') {
        toast.error('ພະນັກງານນີ້ລາໃນວັນນີ້ແລ້ວ');
      } else {
        toast.error('ເກີດຂໍ້ຜິດພາດ');
      }
    }
  }, []);

  const deleteLeave = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('leaves')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setLeaves(prev => prev.filter(l => l.id !== id));
      toast.success('ລຶບການລາສຳເລັດ');
    } catch (error) {
      console.error('Error deleting leave:', error);
      toast.error('ເກີດຂໍ້ຜິດພາດ');
    }
  }, []);

  return {
    leaves,
    loading,
    addLeave,
    deleteLeave,
    refetch: fetchLeaves,
  };
}
