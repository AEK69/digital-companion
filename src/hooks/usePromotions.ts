import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CartItem } from './useSales';

export interface Promotion {
  id: string;
  name: string;
  description: string | null;
  type: 'percentage' | 'fixed' | 'buy_x_get_y';
  value: number;
  min_purchase_amount: number;
  buy_quantity: number;
  get_quantity: number;
  applicable_products: string[];
  applicable_categories: string[];
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Coupon {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: 'percentage' | 'fixed';
  value: number;
  min_purchase_amount: number;
  max_discount_amount: number | null;
  usage_limit: number | null;
  used_count: number;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PromotionResult {
  promotion: Promotion;
  discount: number;
  freeItems: { product_id: string; quantity: number }[];
  description: string;
}

export function usePromotions() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPromotions = useCallback(async () => {
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('is_active', true)
        .lte('start_date', now)
        .or(`end_date.is.null,end_date.gte.${now}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPromotions((data || []) as unknown as Promotion[]);
    } catch (error: any) {
      console.error('Error fetching promotions:', error);
    }
  }, []);

  const fetchCoupons = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCoupons((data || []) as unknown as Coupon[]);
    } catch (error: any) {
      console.error('Error fetching coupons:', error);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchPromotions(), fetchCoupons()]);
      setLoading(false);
    };
    loadData();
  }, [fetchPromotions, fetchCoupons]);

  // Add promotion
  const addPromotion = useCallback(async (promotion: Omit<Promotion, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('promotions')
        .insert([promotion])
        .select()
        .single();

      if (error) throw error;
      setPromotions(prev => [data as unknown as Promotion, ...prev]);
      toast.success('ເພີ່ມໂປຣໂມຊັນສຳເລັດ');
      return data;
    } catch (error: any) {
      console.error('Error adding promotion:', error);
      toast.error('ບໍ່ສາມາດເພີ່ມໂປຣໂມຊັນໄດ້');
      return null;
    }
  }, []);

  // Update promotion
  const updatePromotion = useCallback(async (id: string, updates: Partial<Promotion>) => {
    try {
      const { data, error } = await supabase
        .from('promotions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setPromotions(prev => prev.map(p => p.id === id ? data as unknown as Promotion : p));
      toast.success('ອັບເດດໂປຣໂມຊັນສຳເລັດ');
      return data;
    } catch (error: any) {
      console.error('Error updating promotion:', error);
      toast.error('ບໍ່ສາມາດອັບເດດໂປຣໂມຊັນໄດ້');
      return null;
    }
  }, []);

  // Delete promotion
  const deletePromotion = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('promotions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setPromotions(prev => prev.filter(p => p.id !== id));
      toast.success('ລຶບໂປຣໂມຊັນສຳເລັດ');
    } catch (error: any) {
      console.error('Error deleting promotion:', error);
      toast.error('ບໍ່ສາມາດລຶບໂປຣໂມຊັນໄດ້');
    }
  }, []);

  // Add coupon
  const addCoupon = useCallback(async (coupon: Omit<Coupon, 'id' | 'created_at' | 'updated_at' | 'used_count'>) => {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .insert([{ ...coupon, used_count: 0 }])
        .select()
        .single();

      if (error) throw error;
      setCoupons(prev => [data as unknown as Coupon, ...prev]);
      toast.success('ເພີ່ມຄູປອງສຳເລັດ');
      return data;
    } catch (error: any) {
      console.error('Error adding coupon:', error);
      toast.error('ບໍ່ສາມາດເພີ່ມຄູປອງໄດ້');
      return null;
    }
  }, []);

  // Update coupon
  const updateCoupon = useCallback(async (id: string, updates: Partial<Coupon>) => {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setCoupons(prev => prev.map(c => c.id === id ? data as unknown as Coupon : c));
      toast.success('ອັບເດດຄູປອງສຳເລັດ');
      return data;
    } catch (error: any) {
      console.error('Error updating coupon:', error);
      toast.error('ບໍ່ສາມາດອັບເດດຄູປອງໄດ້');
      return null;
    }
  }, []);

  // Delete coupon
  const deleteCoupon = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('coupons')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setCoupons(prev => prev.filter(c => c.id !== id));
      toast.success('ລຶບຄູປອງສຳເລັດ');
    } catch (error: any) {
      console.error('Error deleting coupon:', error);
      toast.error('ບໍ່ສາມາດລຶບຄູປອງໄດ້');
    }
  }, []);

  // Validate and apply coupon
  const validateCoupon = useCallback(async (code: string, cartTotal: number): Promise<Coupon | null> => {
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('is_active', true)
        .lte('start_date', now)
        .single();

      if (error) {
        toast.error('ລະຫັດຄູປອງບໍ່ຖືກຕ້ອງ');
        return null;
      }

      const coupon = data as unknown as Coupon;

      // Check end date
      if (coupon.end_date && new Date(coupon.end_date) < new Date()) {
        toast.error('ຄູປອງນີ້ໝົດອາຍຸແລ້ວ');
        return null;
      }

      // Check usage limit
      if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
        toast.error('ຄູປອງນີ້ໃຊ້ຄົບຈຳນວນແລ້ວ');
        return null;
      }

      // Check minimum purchase
      if (cartTotal < coupon.min_purchase_amount) {
        toast.error(`ຕ້ອງຊື້ຂັ້ນຕ່ຳ ₭${coupon.min_purchase_amount.toLocaleString()}`);
        return null;
      }

      toast.success(`ໃຊ້ຄູປອງ "${coupon.name}" ສຳເລັດ`);
      return coupon;
    } catch (error) {
      toast.error('ລະຫັດຄູປອງບໍ່ຖືກຕ້ອງ');
      return null;
    }
  }, []);

  // Calculate coupon discount
  const calculateCouponDiscount = useCallback((coupon: Coupon, cartTotal: number): number => {
    let discount = 0;
    
    if (coupon.type === 'percentage') {
      discount = (cartTotal * coupon.value) / 100;
    } else {
      discount = coupon.value;
    }

    // Apply max discount limit
    if (coupon.max_discount_amount && discount > coupon.max_discount_amount) {
      discount = coupon.max_discount_amount;
    }

    return Math.min(discount, cartTotal);
  }, []);

  // Use coupon (increment used_count)
  const useCoupon = useCallback(async (couponId: string) => {
    try {
      await supabase.rpc('increment_coupon_usage' as any, { coupon_id: couponId });
    } catch (error) {
      console.error('Error using coupon:', error);
    }
  }, []);

  // Calculate applicable promotions for cart
  const calculatePromotions = useCallback((cart: CartItem[], products: { id: string; category_id: string | null }[]): PromotionResult[] => {
    const results: PromotionResult[] = [];
    const cartTotal = cart.reduce((sum, item) => sum + item.total_price, 0);

    for (const promo of promotions) {
      // Check min purchase
      if (cartTotal < promo.min_purchase_amount) continue;

      // Get applicable items
      const applicableItems = cart.filter(item => {
        if (promo.applicable_products.length > 0) {
          return promo.applicable_products.includes(item.product_id);
        }
        if (promo.applicable_categories.length > 0) {
          const product = products.find(p => p.id === item.product_id);
          return product?.category_id && promo.applicable_categories.includes(product.category_id);
        }
        return true; // Apply to all if no specific products/categories
      });

      if (applicableItems.length === 0 && (promo.applicable_products.length > 0 || promo.applicable_categories.length > 0)) {
        continue;
      }

      const applicableTotal = applicableItems.length > 0 
        ? applicableItems.reduce((sum, item) => sum + item.total_price, 0)
        : cartTotal;

      if (promo.type === 'percentage') {
        const discount = (applicableTotal * promo.value) / 100;
        results.push({
          promotion: promo,
          discount,
          freeItems: [],
          description: `ຫຼຸດ ${promo.value}% = ₭${discount.toLocaleString()}`,
        });
      } else if (promo.type === 'fixed') {
        results.push({
          promotion: promo,
          discount: Math.min(promo.value, applicableTotal),
          freeItems: [],
          description: `ຫຼຸດ ₭${promo.value.toLocaleString()}`,
        });
      } else if (promo.type === 'buy_x_get_y') {
        // Buy X Get Y logic
        for (const item of applicableItems) {
          const freeQuantity = Math.floor(item.quantity / promo.buy_quantity) * promo.get_quantity;
          if (freeQuantity > 0) {
            const freeValue = freeQuantity * item.unit_price;
            results.push({
              promotion: promo,
              discount: freeValue,
              freeItems: [{ product_id: item.product_id, quantity: freeQuantity }],
              description: `ຊື້ ${promo.buy_quantity} ແຖມ ${promo.get_quantity} = ₭${freeValue.toLocaleString()}`,
            });
          }
        }
      }
    }

    return results;
  }, [promotions]);

  return {
    promotions,
    coupons,
    loading,
    addPromotion,
    updatePromotion,
    deletePromotion,
    addCoupon,
    updateCoupon,
    deleteCoupon,
    validateCoupon,
    calculateCouponDiscount,
    useCoupon,
    calculatePromotions,
    refetch: () => Promise.all([fetchPromotions(), fetchCoupons()]),
  };
}
