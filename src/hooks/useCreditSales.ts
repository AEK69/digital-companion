import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CreditSale {
  id: string;
  sale_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  customer_address: string | null;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: 'pending' | 'partial' | 'paid';
  due_date: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreditPayment {
  id: string;
  credit_sale_id: string;
  amount: number;
  payment_method: string;
  note: string | null;
  created_at: string;
}

export interface CreateCreditSaleInput {
  sale_id?: string;
  customer_name: string;
  customer_phone?: string;
  customer_address?: string;
  total_amount: number;
  due_date?: string;
  note?: string;
}

export function useCreditSales() {
  const [creditSales, setCreditSales] = useState<CreditSale[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchCreditSales = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('credit_sales')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCreditSales((data || []) as CreditSale[]);
    } catch (error: any) {
      console.error('Error fetching credit sales:', error);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchCreditSales();
      setLoading(false);
    };
    loadData();
  }, [fetchCreditSales]);

  const createCreditSale = useCallback(async (input: CreateCreditSaleInput) => {
    try {
      const { data, error } = await supabase
        .from('credit_sales')
        .insert([{
          sale_id: input.sale_id || null,
          customer_name: input.customer_name,
          customer_phone: input.customer_phone || null,
          customer_address: input.customer_address || null,
          total_amount: input.total_amount,
          paid_amount: 0,
          remaining_amount: input.total_amount,
          status: 'pending',
          due_date: input.due_date || null,
          note: input.note || null,
        }])
        .select()
        .single();

      if (error) throw error;
      
      setCreditSales(prev => [data as CreditSale, ...prev]);
      toast({
        title: 'ບັນທຶກສຳເລັດ',
        description: `ບັນທຶກການຕິດໜີ້ຂອງ ${input.customer_name} ແລ້ວ`,
      });
      
      return data as CreditSale;
    } catch (error: any) {
      console.error('Error creating credit sale:', error);
      toast({
        title: 'ເກີດຂໍ້ຜິດພາດ',
        description: error.message || 'ບໍ່ສາມາດບັນທຶກການຕິດໜີ້ໄດ້',
        variant: 'destructive',
      });
      return null;
    }
  }, [toast]);

  const addPayment = useCallback(async (
    creditSaleId: string,
    amount: number,
    paymentMethod: string = 'cash',
    note?: string
  ) => {
    try {
      // Get current credit sale
      const creditSale = creditSales.find(cs => cs.id === creditSaleId);
      if (!creditSale) throw new Error('ບໍ່ພົບຂໍ້ມູນການຕິດໜີ້');

      const newPaidAmount = creditSale.paid_amount + amount;
      const newRemainingAmount = creditSale.total_amount - newPaidAmount;
      const newStatus = newRemainingAmount <= 0 ? 'paid' : newPaidAmount > 0 ? 'partial' : 'pending';

      // Create payment record
      const { error: paymentError } = await supabase
        .from('credit_payments')
        .insert([{
          credit_sale_id: creditSaleId,
          amount,
          payment_method: paymentMethod,
          note: note || null,
        }]);

      if (paymentError) throw paymentError;

      // Update credit sale
      const { error: updateError } = await supabase
        .from('credit_sales')
        .update({
          paid_amount: newPaidAmount,
          remaining_amount: Math.max(0, newRemainingAmount),
          status: newStatus,
        })
        .eq('id', creditSaleId);

      if (updateError) throw updateError;

      setCreditSales(prev => prev.map(cs => 
        cs.id === creditSaleId 
          ? { 
              ...cs, 
              paid_amount: newPaidAmount, 
              remaining_amount: Math.max(0, newRemainingAmount),
              status: newStatus as CreditSale['status']
            } 
          : cs
      ));

      toast({
        title: 'ຮັບຊຳລະສຳເລັດ',
        description: `ຮັບເງິນ ₭${amount.toLocaleString()} ແລ້ວ`,
      });

      return true;
    } catch (error: any) {
      console.error('Error adding payment:', error);
      toast({
        title: 'ເກີດຂໍ້ຜິດພາດ',
        description: error.message || 'ບໍ່ສາມາດບັນທຶກການຊຳລະໄດ້',
        variant: 'destructive',
      });
      return false;
    }
  }, [creditSales, toast]);

  const getPaymentHistory = useCallback(async (creditSaleId: string) => {
    try {
      const { data, error } = await supabase
        .from('credit_payments')
        .select('*')
        .eq('credit_sale_id', creditSaleId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as CreditPayment[];
    } catch (error: any) {
      console.error('Error fetching payment history:', error);
      return [];
    }
  }, []);

  const getCreditSalesByPeriod = useCallback((
    period: 'day' | 'month' | 'year',
    date: Date = new Date()
  ) => {
    return creditSales.filter(cs => {
      const csDate = new Date(cs.created_at);
      switch (period) {
        case 'day':
          return csDate.toDateString() === date.toDateString();
        case 'month':
          return csDate.getMonth() === date.getMonth() && 
                 csDate.getFullYear() === date.getFullYear();
        case 'year':
          return csDate.getFullYear() === date.getFullYear();
        default:
          return true;
      }
    });
  }, [creditSales]);

  const getTotalsByStatus = useCallback(() => {
    return {
      pending: creditSales.filter(cs => cs.status === 'pending').reduce((sum, cs) => sum + cs.remaining_amount, 0),
      partial: creditSales.filter(cs => cs.status === 'partial').reduce((sum, cs) => sum + cs.remaining_amount, 0),
      paid: creditSales.filter(cs => cs.status === 'paid').reduce((sum, cs) => sum + cs.total_amount, 0),
      totalRemaining: creditSales.filter(cs => cs.status !== 'paid').reduce((sum, cs) => sum + cs.remaining_amount, 0),
    };
  }, [creditSales]);

  return {
    creditSales,
    loading,
    createCreditSale,
    addPayment,
    getPaymentHistory,
    getCreditSalesByPeriod,
    getTotalsByStatus,
    refetch: fetchCreditSales,
  };
}
