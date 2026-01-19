import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Sale {
  id: string;
  sale_number: string;
  employee_id: string | null;
  total_amount: number;
  discount_amount: number;
  final_amount: number;
  payment_method: string;
  status: string;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface CartItem {
  product_id: string;
  product_name: string;
  barcode: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  stock_quantity: number;
}

export function useSales() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSales = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSales(data || []);
    } catch (error: any) {
      console.error('Error fetching sales:', error);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchSales();
      setLoading(false);
    };
    loadData();
  }, [fetchSales]);

  const createSale = useCallback(async (
    items: CartItem[],
    paymentMethod: string,
    discountAmount: number = 0,
    employeeId?: string,
    note?: string,
    customerId?: string,
    pointsDiscount: number = 0
  ) => {
    try {
      const totalAmount = items.reduce((sum, item) => sum + item.total_price, 0);
      const finalAmount = totalAmount - discountAmount - pointsDiscount;

      // Generate sale number
      const saleNumber = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;

      // Create sale
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert([{
          sale_number: saleNumber,
          employee_id: employeeId || null,
          customer_id: customerId || null,
          total_amount: totalAmount,
          discount_amount: discountAmount + pointsDiscount,
          final_amount: finalAmount,
          payment_method: paymentMethod,
          status: 'completed',
          note: note || (pointsDiscount > 0 ? `ສ່ວນຫຼຸດຈາກຄະແນນ: ₭${pointsDiscount.toLocaleString()}` : null),
        }])
        .select()
        .single();

      if (saleError) throw saleError;

      // Create sale items
      const saleItems = items.map(item => ({
        sale_id: sale.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems);

      if (itemsError) throw itemsError;

      setSales(prev => [sale, ...prev]);
      toast({
        title: 'ສຳເລັດ',
        description: `ຂາຍສິນຄ້າສຳເລັດ - ${sale.sale_number}`,
      });

      return sale;
    } catch (error: any) {
      console.error('Error creating sale:', error);
      toast({
        title: 'ເກີດຂໍ້ຜິດພາດ',
        description: error.message || 'ບໍ່ສາມາດບັນທຶກການຂາຍໄດ້',
        variant: 'destructive',
      });
      return null;
    }
  }, [toast]);

  const getSaleItems = useCallback(async (saleId: string) => {
    try {
      const { data, error } = await supabase
        .from('sale_items')
        .select('*')
        .eq('sale_id', saleId);

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Error fetching sale items:', error);
      return [];
    }
  }, []);

  const getMonthlySales = useCallback(async (year: number, month: number) => {
    try {
      const startDate = new Date(year, month - 1, 1).toISOString();
      const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .eq('status', 'completed');

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error fetching monthly sales:', error);
      return [];
    }
  }, []);

  const cancelSale = useCallback(async (saleId: string) => {
    try {
      const { error } = await supabase
        .from('sales')
        .update({ status: 'cancelled' })
        .eq('id', saleId);

      if (error) throw error;
      setSales(prev => prev.map(s => 
        s.id === saleId ? { ...s, status: 'cancelled' } : s
      ));
      toast({
        title: 'ສຳເລັດ',
        description: 'ຍົກເລີກການຂາຍແລ້ວ',
      });
    } catch (error: any) {
      console.error('Error cancelling sale:', error);
      toast({
        title: 'ເກີດຂໍ້ຜິດພາດ',
        description: error.message || 'ບໍ່ສາມາດຍົກເລີກການຂາຍໄດ້',
        variant: 'destructive',
      });
    }
  }, [toast]);

  return {
    sales,
    loading,
    createSale,
    getSaleItems,
    getMonthlySales,
    cancelSale,
    refetch: fetchSales,
  };
}
