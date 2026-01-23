import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CartItem } from './useSales';

interface OfflineSale {
  id: string;
  items: CartItem[];
  paymentMethod: string;
  discountAmount: number;
  employeeId?: string;
  customerId?: string;
  pointsDiscount: number;
  totalAmount: number;
  finalAmount: number;
  createdAt: string;
}

const OFFLINE_SALES_KEY = 'pos_offline_sales_queue';

export function useOfflineSales() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineSales, setOfflineSales] = useState<OfflineSale[]>([]);
  const [syncing, setSyncing] = useState(false);
  const syncingRef = useRef(false);

  // Load offline sales from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(OFFLINE_SALES_KEY);
    if (stored) {
      try {
        setOfflineSales(JSON.parse(stored));
      } catch (e) {
        console.error('Error parsing offline sales:', e);
      }
    }
  }, []);

  // Save to localStorage when offlineSales changes
  useEffect(() => {
    localStorage.setItem(OFFLINE_SALES_KEY, JSON.stringify(offlineSales));
  }, [offlineSales]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('ເຊື່ອມຕໍ່ອິນເຕີເນັດແລ້ວ', {
        description: 'ກຳລັງ sync ຂໍ້ມູນ...',
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('ອອບໄລນ໌ໂໝດ', {
        description: 'ການຂາຍຈະຖືກບັນທຶກໄວ້ ແລະ sync ເມື່ອເນັດມາ',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-sync when online
  useEffect(() => {
    if (isOnline && offlineSales.length > 0 && !syncingRef.current) {
      syncOfflineSales();
    }
  }, [isOnline, offlineSales.length]);

  // Add sale to offline queue
  const addOfflineSale = useCallback((sale: Omit<OfflineSale, 'id' | 'createdAt'>) => {
    const offlineSale: OfflineSale = {
      ...sale,
      id: `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };

    setOfflineSales(prev => [...prev, offlineSale]);
    
    toast.info('ບັນທຶກການຂາຍແບບອອບໄລນ໌', {
      description: 'ຈະ sync ເມື່ອເຊື່ອມຕໍ່ອິນເຕີເນັດ',
    });

    return offlineSale;
  }, []);

  // Sync offline sales to server
  const syncOfflineSales = useCallback(async () => {
    if (offlineSales.length === 0 || syncingRef.current) return;

    syncingRef.current = true;
    setSyncing(true);

    const failedSales: OfflineSale[] = [];
    const successCount = { count: 0 };

    for (const sale of offlineSales) {
      try {
        // Generate sale number
        const saleNumber = `INV-${new Date(sale.createdAt).toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;

        // Create sale
        const { data: createdSale, error: saleError } = await supabase
          .from('sales')
          .insert([{
            sale_number: saleNumber,
            employee_id: sale.employeeId || null,
            customer_id: sale.customerId || null,
            total_amount: sale.totalAmount,
            discount_amount: sale.discountAmount + sale.pointsDiscount,
            final_amount: sale.finalAmount,
            payment_method: sale.paymentMethod,
            status: 'completed',
            note: `Synced from offline - ${sale.id}`,
            created_at: sale.createdAt,
          }])
          .select()
          .single();

        if (saleError) throw saleError;

        // Create sale items
        const saleItems = sale.items.map(item => ({
          sale_id: createdSale.id,
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

        // Record sync in queue table
        await supabase
          .from('offline_sales_queue')
          .insert([{
            sale_data: sale as any,
            status: 'synced',
            synced_at: new Date().toISOString(),
          }]);

        successCount.count++;
      } catch (error) {
        console.error('Error syncing sale:', error);
        failedSales.push(sale);
        
        // Record failed sync
        await supabase
          .from('offline_sales_queue')
          .insert([{
            sale_data: sale as any,
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
          }]);
      }
    }

    setOfflineSales(failedSales);
    syncingRef.current = false;
    setSyncing(false);

    if (successCount.count > 0) {
      toast.success(`Sync ສຳເລັດ ${successCount.count} ລາຍການ`, {
        description: failedSales.length > 0 ? `${failedSales.length} ລາຍການລົ້ມເຫຼວ` : undefined,
      });
    }

    if (failedSales.length > 0) {
      toast.error(`${failedSales.length} ລາຍການ sync ບໍ່ສຳເລັດ`, {
        description: 'ຈະລອງໃໝ່ອັດຕະໂນມັດ',
      });
    }
  }, [offlineSales]);

  // Clear all offline sales
  const clearOfflineSales = useCallback(() => {
    setOfflineSales([]);
    localStorage.removeItem(OFFLINE_SALES_KEY);
  }, []);

  // Check if should use offline mode
  const shouldUseOffline = useCallback((): boolean => {
    return !isOnline;
  }, [isOnline]);

  return {
    isOnline,
    offlineSales,
    syncing,
    pendingCount: offlineSales.length,
    addOfflineSale,
    syncOfflineSales,
    clearOfflineSales,
    shouldUseOffline,
  };
}
