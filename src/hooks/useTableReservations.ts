import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export interface TableReservation {
  id: string;
  customer_name: string;
  phone: string | null;
  email: string | null;
  date: string;
  time: string;
  guests: number;
  table_number: string | null;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateReservationData {
  customer_name: string;
  phone?: string;
  email?: string;
  date: string;
  time: string;
  guests: number;
  table_number?: string;
  notes?: string;
}

export function useTableReservations() {
  const [reservations, setReservations] = useState<TableReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchReservations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('table_reservations')
        .select('*')
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (error) throw error;
      setReservations((data || []) as TableReservation[]);
    } catch (error: any) {
      console.error('Error fetching reservations:', error);
      toast({
        title: 'ເກີດຂໍ້ຜິດພາດ',
        description: 'ບໍ່ສາມາດໂຫຼດຂໍ້ມູນການຈອງໄດ້',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  const createReservation = async (data: CreateReservationData): Promise<TableReservation | null> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data: reservation, error } = await supabase
        .from('table_reservations')
        .insert({
          customer_name: data.customer_name,
          phone: data.phone || null,
          email: data.email || null,
          date: data.date,
          time: data.time,
          guests: data.guests,
          table_number: data.table_number || null,
          notes: data.notes || null,
          created_by: userData.user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;

      setReservations(prev => [...prev, reservation as TableReservation]);
      toast({
        title: 'ຈອງໂຕະສຳເລັດ',
        description: `${data.customer_name} - ${format(new Date(data.date), 'dd/MM/yyyy')} ${data.time}`,
      });
      return reservation as TableReservation;
    } catch (error: any) {
      console.error('Error creating reservation:', error);
      toast({
        title: 'ເກີດຂໍ້ຜິດພາດ',
        description: error.message || 'ບໍ່ສາມາດສ້າງການຈອງໄດ້',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateReservation = async (id: string, updates: Partial<CreateReservationData & { status: string }>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('table_reservations')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      setReservations(prev => 
        prev.map(r => r.id === id ? { ...r, ...updates } as TableReservation : r)
      );
      toast({
        title: 'ອັບເດດສຳເລັດ',
        description: 'ແກ້ໄຂຂໍ້ມູນການຈອງແລ້ວ',
      });
      return true;
    } catch (error: any) {
      console.error('Error updating reservation:', error);
      toast({
        title: 'ເກີດຂໍ້ຜິດພາດ',
        description: error.message || 'ບໍ່ສາມາດແກ້ໄຂການຈອງໄດ້',
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteReservation = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('table_reservations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setReservations(prev => prev.filter(r => r.id !== id));
      toast({
        title: 'ລົບສຳເລັດ',
        description: 'ລົບການຈອງອອກແລ້ວ',
      });
      return true;
    } catch (error: any) {
      console.error('Error deleting reservation:', error);
      toast({
        title: 'ເກີດຂໍ້ຜິດພາດ',
        description: error.message || 'ບໍ່ສາມາດລົບການຈອງໄດ້',
        variant: 'destructive',
      });
      return false;
    }
  };

  const getReservationsByDate = (date: string) => {
    return reservations.filter(r => r.date === date);
  };

  const getTodayReservations = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return getReservationsByDate(today);
  };

  return {
    reservations,
    loading,
    createReservation,
    updateReservation,
    deleteReservation,
    getReservationsByDate,
    getTodayReservations,
    refetch: fetchReservations,
  };
}
