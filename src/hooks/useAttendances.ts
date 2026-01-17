import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Attendance, Employee } from '@/types';
import { toast } from 'sonner';

interface DbAttendance {
  id: string;
  employee_id: string;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  hours: number;
  wage: number;
  bonus: number;
  total: number;
}

export function useAttendances(employees: Employee[]) {
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAttendances = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('attendances')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;

      setAttendances(
        (data || []).map((att: DbAttendance) => ({
          id: att.id,
          employeeId: att.employee_id,
          date: att.date,
          clockIn: att.clock_in || undefined,
          clockOut: att.clock_out || undefined,
          hours: Number(att.hours),
          wage: Number(att.wage),
          bonus: Number(att.bonus),
          total: Number(att.total),
        }))
      );
    } catch (error) {
      console.error('Error fetching attendances:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAttendances();
  }, [fetchAttendances]);

  const clockIn = useCallback(async (employeeId: string, manualTime?: string) => {
    const today = new Date().toISOString().split('T')[0];
    const time = manualTime || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

    try {
      const { data, error } = await supabase
        .from('attendances')
        .insert([{
          employee_id: employeeId,
          date: today,
          clock_in: time,
          hours: 0,
          wage: 0,
          bonus: 0,
          total: 0,
        }])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const newAtt: Attendance = {
          id: data.id,
          employeeId: data.employee_id,
          date: data.date,
          clockIn: data.clock_in || undefined,
          hours: 0,
          wage: 0,
          bonus: 0,
          total: 0,
        };
        setAttendances(prev => [newAtt, ...prev]);
        toast.success('ບັນທຶກເຂົ້າວຽກສຳເລັດ');
      }
    } catch (error: any) {
      console.error('Error clocking in:', error);
      if (error.code === '23505') {
        toast.error('ພະນັກງານນີ້ລົງເວລາເຂົ້າວຽກແລ້ວ');
      } else {
        toast.error('ເກີດຂໍ້ຜິດພາດ');
      }
    }
  }, []);

  const clockOut = useCallback(async (employeeId: string, manualTime?: string) => {
    const today = new Date().toISOString().split('T')[0];
    const time = manualTime || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

    // Find today's attendance
    const todayAtt = attendances.find(a => a.employeeId === employeeId && a.date === today && !a.clockOut);
    if (!todayAtt) {
      toast.error('ບໍ່ພົບການເຂົ້າວຽກ');
      return;
    }

    const employee = employees.find(e => e.id === employeeId);
    const clockInTime = todayAtt.clockIn?.split(':').map(Number) || [0, 0];
    const clockOutTime = time.split(':').map(Number);
    const hours = Math.max(0, (clockOutTime[0] - clockInTime[0]) + (clockOutTime[1] - clockInTime[1]) / 60);
    const wage = hours * (employee?.hourlyRate || 0);
    const total = wage + (todayAtt.bonus || 0);

    try {
      const { error } = await supabase
        .from('attendances')
        .update({
          clock_out: time,
          hours,
          wage,
          total,
        })
        .eq('id', todayAtt.id);

      if (error) throw error;

      setAttendances(prev => prev.map(a => 
        a.id === todayAtt.id 
          ? { ...a, clockOut: time, hours, wage, total }
          : a
      ));
      toast.success('ບັນທຶກອອກວຽກສຳເລັດ');
    } catch (error) {
      console.error('Error clocking out:', error);
      toast.error('ເກີດຂໍ້ຜິດພາດ');
    }
  }, [attendances, employees]);

  const updateBonus = useCallback(async (attendanceId: string, bonus: number) => {
    const att = attendances.find(a => a.id === attendanceId);
    if (!att) return;

    const total = att.wage + bonus;

    try {
      const { error } = await supabase
        .from('attendances')
        .update({ bonus, total })
        .eq('id', attendanceId);

      if (error) throw error;

      setAttendances(prev => prev.map(a => 
        a.id === attendanceId ? { ...a, bonus, total } : a
      ));
      toast.success('ອັບເດດໂບນັດສຳເລັດ');
    } catch (error) {
      console.error('Error updating bonus:', error);
      toast.error('ເກີດຂໍ້ຜິດພາດ');
    }
  }, [attendances]);

  return {
    attendances,
    loading,
    clockIn,
    clockOut,
    updateBonus,
    refetch: fetchAttendances,
  };
}
