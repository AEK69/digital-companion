import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  loyalty_points: number;
  total_purchases: number;
  created_at: string;
  updated_at: string;
}

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchCustomers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error: any) {
      console.error('Error fetching customers:', error);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchCustomers();
      setLoading(false);
    };
    loadData();
  }, [fetchCustomers]);

  const addCustomer = useCallback(async (customer: Omit<Customer, 'id' | 'loyalty_points' | 'total_purchases' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert([customer])
        .select()
        .single();

      if (error) throw error;
      setCustomers(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      toast({
        title: 'ສຳເລັດ',
        description: 'ເພີ່ມລູກຄ້າໃໝ່ແລ້ວ',
      });
      return data;
    } catch (error: any) {
      console.error('Error adding customer:', error);
      toast({
        title: 'ເກີດຂໍ້ຜິດພາດ',
        description: error.message || 'ບໍ່ສາມາດເພີ່ມລູກຄ້າໄດ້',
        variant: 'destructive',
      });
      return null;
    }
  }, [toast]);

  const updateCustomer = useCallback(async (id: string, updates: Partial<Customer>) => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setCustomers(prev => prev.map(c => c.id === id ? data : c));
      toast({
        title: 'ສຳເລັດ',
        description: 'ອັບເດດຂໍ້ມູນລູກຄ້າແລ້ວ',
      });
      return data;
    } catch (error: any) {
      console.error('Error updating customer:', error);
      toast({
        title: 'ເກີດຂໍ້ຜິດພາດ',
        description: error.message || 'ບໍ່ສາມາດອັບເດດລູກຄ້າໄດ້',
        variant: 'destructive',
      });
      return null;
    }
  }, [toast]);

  const deleteCustomer = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setCustomers(prev => prev.filter(c => c.id !== id));
      toast({
        title: 'ສຳເລັດ',
        description: 'ລົບລູກຄ້າແລ້ວ',
      });
    } catch (error: any) {
      console.error('Error deleting customer:', error);
      toast({
        title: 'ເກີດຂໍ້ຜິດພາດ',
        description: error.message || 'ບໍ່ສາມາດລົບລູກຄ້າໄດ້',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const redeemPoints = useCallback(async (id: string, pointsToRedeem: number) => {
    const customer = customers.find(c => c.id === id);
    if (!customer || customer.loyalty_points < pointsToRedeem) {
      toast({
        title: 'ເກີດຂໍ້ຜິດພາດ',
        description: 'ຄະແນນບໍ່ພຽງພໍ',
        variant: 'destructive',
      });
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('customers')
        .update({ loyalty_points: customer.loyalty_points - pointsToRedeem })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setCustomers(prev => prev.map(c => c.id === id ? data : c));
      toast({
        title: 'ສຳເລັດ',
        description: `ແລກ ${pointsToRedeem} ຄະແນນແລ້ວ`,
      });
      return data;
    } catch (error: any) {
      console.error('Error redeeming points:', error);
      toast({
        title: 'ເກີດຂໍ້ຜິດພາດ',
        description: error.message || 'ບໍ່ສາມາດແລກຄະແນນໄດ້',
        variant: 'destructive',
      });
      return null;
    }
  }, [customers, toast]);

  const getCustomerByPhone = useCallback((phone: string) => {
    return customers.find(c => c.phone === phone);
  }, [customers]);

  return {
    customers,
    loading,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    redeemPoints,
    getCustomerByPhone,
    refetch: fetchCustomers,
  };
}
