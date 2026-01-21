import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ProductVariant {
  id: string;
  product_id: string;
  sku: string | null;
  barcode: string | null;
  attributes: Record<string, string>;
  cost_price: number;
  selling_price: number;
  stock_quantity: number;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VariantAttribute {
  name: string;
  values: string[];
}

function parseVariant(raw: unknown): ProductVariant {
  const data = raw as Record<string, unknown>;
  return {
    id: data.id as string,
    product_id: data.product_id as string,
    sku: data.sku as string | null,
    barcode: data.barcode as string | null,
    attributes: typeof data.attributes === 'string' 
      ? JSON.parse(data.attributes) 
      : (data.attributes as Record<string, string>) || {},
    cost_price: data.cost_price as number,
    selling_price: data.selling_price as number,
    stock_quantity: data.stock_quantity as number,
    image_url: data.image_url as string | null,
    is_active: data.is_active as boolean,
    created_at: data.created_at as string,
    updated_at: data.updated_at as string,
  };
}

export function useProductVariants(productId?: string) {
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchVariants = useCallback(async () => {
    if (!productId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('product_variants' as any)
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      const parsed = ((data || []) as unknown[]).map(parseVariant);
      setVariants(parsed);
    } catch (error: any) {
      console.error('Error fetching variants:', error);
      if (!error.message?.includes('does not exist')) {
        toast.error('ບໍ່ສາມາດໂຫລດຂໍ້ມູນຕົວເລືອກສິນຄ້າໄດ້');
      }
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchVariants();
  }, [fetchVariants]);

  const addVariant = useCallback(async (variant: Omit<ProductVariant, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('product_variants' as any)
        .insert([{
          ...variant,
          attributes: JSON.stringify(variant.attributes),
        }])
        .select()
        .single();

      if (error) throw error;
      
      const parsed = parseVariant(data as unknown);
      setVariants(prev => [...prev, parsed]);
      toast.success('ເພີ່ມຕົວເລືອກສິນຄ້າສຳເລັດ');
      return parsed;
    } catch (error: any) {
      console.error('Error adding variant:', error);
      toast.error('ບໍ່ສາມາດເພີ່ມຕົວເລືອກສິນຄ້າໄດ້');
      return null;
    }
  }, []);

  const updateVariant = useCallback(async (id: string, updates: Partial<ProductVariant>) => {
    try {
      const updateData: Record<string, unknown> = { ...updates };
      if (updates.attributes) {
        updateData.attributes = JSON.stringify(updates.attributes);
      }
      
      const { data, error } = await supabase
        .from('product_variants' as any)
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      const parsed = parseVariant(data as unknown);
      setVariants(prev => prev.map(v => v.id === id ? parsed : v));
      toast.success('ອັບເດດຕົວເລືອກສິນຄ້າສຳເລັດ');
      return parsed;
    } catch (error: any) {
      console.error('Error updating variant:', error);
      toast.error('ບໍ່ສາມາດອັບເດດຕົວເລືອກສິນຄ້າໄດ້');
      return null;
    }
  }, []);

  const deleteVariant = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('product_variants' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setVariants(prev => prev.filter(v => v.id !== id));
      toast.success('ລຶບຕົວເລືອກສິນຄ້າສຳເລັດ');
    } catch (error: any) {
      console.error('Error deleting variant:', error);
      toast.error('ບໍ່ສາມາດລຶບຕົວເລືອກສິນຄ້າໄດ້');
    }
  }, []);

  const getVariantByBarcode = useCallback(async (barcode: string) => {
    try {
      const { data, error } = await supabase
        .from('product_variants' as any)
        .select('*, products!inner(name, unit)')
        .eq('barcode', barcode)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      
      return parseVariant(data as unknown);
    } catch {
      return null;
    }
  }, []);

  const updateVariantStock = useCallback(async (variantId: string, quantityChange: number, type: 'in' | 'out', note?: string) => {
    try {
      const variant = variants.find(v => v.id === variantId);
      if (!variant) throw new Error('Variant not found');

      const newStock = variant.stock_quantity + (type === 'in' ? quantityChange : -quantityChange);
      if (newStock < 0) throw new Error('Stock cannot be negative');

      const { error: updateError } = await supabase
        .from('product_variants' as any)
        .update({ stock_quantity: newStock })
        .eq('id', variantId);

      if (updateError) throw updateError;

      await supabase
        .from('inventory_transactions')
        .insert([{
          product_id: variant.product_id,
          type,
          quantity: quantityChange,
          previous_stock: variant.stock_quantity,
          new_stock: newStock,
          note: note || `Variant stock ${type}`,
        }]);

      setVariants(prev => prev.map(v => 
        v.id === variantId ? { ...v, stock_quantity: newStock } : v
      ));
      
      toast.success('ອັບເດດສະຕ໊ອກສຳເລັດ');
    } catch (error: any) {
      console.error('Error updating variant stock:', error);
      toast.error(error.message || 'ບໍ່ສາມາດອັບເດດສະຕ໊ອກໄດ້');
    }
  }, [variants]);

  return {
    variants,
    loading,
    addVariant,
    updateVariant,
    deleteVariant,
    getVariantByBarcode,
    updateVariantStock,
    refetch: fetchVariants,
  };
}
