import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Product {
  id: string;
  barcode: string | null;
  name: string;
  description: string | null;
  category_id: string | null;
  image_url: string | null;
  cost_price: number;
  selling_price: number;
  stock_quantity: number;
  min_stock_level: number;
  unit: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchProducts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      toast({
        title: 'ເກີດຂໍ້ຜິດພາດ',
        description: 'ບໍ່ສາມາດໂຫລດສິນຄ້າໄດ້',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const fetchCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('product_categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      console.error('Error fetching categories:', error);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchProducts(), fetchCategories()]);
      setLoading(false);
    };
    loadData();
  }, [fetchProducts, fetchCategories]);

  const addProduct = useCallback(async (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .insert([product])
        .select()
        .single();

      if (error) throw error;
      setProducts(prev => [...prev, data]);
      toast({
        title: 'ສຳເລັດ',
        description: 'ເພີ່ມສິນຄ້າແລ້ວ',
      });
      return data;
    } catch (error: any) {
      console.error('Error adding product:', error);
      toast({
        title: 'ເກີດຂໍ້ຜິດພາດ',
        description: error.message || 'ບໍ່ສາມາດເພີ່ມສິນຄ້າໄດ້',
        variant: 'destructive',
      });
      return null;
    }
  }, [toast]);

  const updateProduct = useCallback(async (id: string, updates: Partial<Product>) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setProducts(prev => prev.map(p => p.id === id ? data : p));
      toast({
        title: 'ສຳເລັດ',
        description: 'ອັບເດດສິນຄ້າແລ້ວ',
      });
      return data;
    } catch (error: any) {
      console.error('Error updating product:', error);
      toast({
        title: 'ເກີດຂໍ້ຜິດພາດ',
        description: error.message || 'ບໍ່ສາມາດອັບເດດສິນຄ້າໄດ້',
        variant: 'destructive',
      });
      return null;
    }
  }, [toast]);

  const deleteProduct = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setProducts(prev => prev.filter(p => p.id !== id));
      toast({
        title: 'ສຳເລັດ',
        description: 'ລຶບສິນຄ້າແລ້ວ',
      });
    } catch (error: any) {
      console.error('Error deleting product:', error);
      toast({
        title: 'ເກີດຂໍ້ຜິດພາດ',
        description: error.message || 'ບໍ່ສາມາດລຶບສິນຄ້າໄດ້',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const addCategory = useCallback(async (category: { name: string; description?: string }) => {
    try {
      const { data, error } = await supabase
        .from('product_categories')
        .insert([category])
        .select()
        .single();

      if (error) throw error;
      setCategories(prev => [...prev, data]);
      toast({
        title: 'ສຳເລັດ',
        description: 'ເພີ່ມໝວດໝູ່ແລ້ວ',
      });
      return data;
    } catch (error: any) {
      console.error('Error adding category:', error);
      toast({
        title: 'ເກີດຂໍ້ຜິດພາດ',
        description: error.message || 'ບໍ່ສາມາດເພີ່ມໝວດໝູ່ໄດ້',
        variant: 'destructive',
      });
      return null;
    }
  }, [toast]);

  const updateStock = useCallback(async (productId: string, quantityChange: number, type: 'in' | 'out' | 'adjustment', note?: string) => {
    try {
      const product = products.find(p => p.id === productId);
      if (!product) throw new Error('Product not found');

      const newStock = product.stock_quantity + quantityChange;
      
      // Update product stock
      const { error: updateError } = await supabase
        .from('products')
        .update({ stock_quantity: newStock })
        .eq('id', productId);

      if (updateError) throw updateError;

      // Record inventory transaction
      const { error: transactionError } = await supabase
        .from('inventory_transactions')
        .insert([{
          product_id: productId,
          type,
          quantity: Math.abs(quantityChange),
          previous_stock: product.stock_quantity,
          new_stock: newStock,
          note,
        }]);

      if (transactionError) throw transactionError;

      setProducts(prev => prev.map(p => 
        p.id === productId ? { ...p, stock_quantity: newStock } : p
      ));

      toast({
        title: 'ສຳເລັດ',
        description: type === 'in' ? 'ເພີ່ມສະຕ໊ອກແລ້ວ' : 'ປັບສະຕ໊ອກແລ້ວ',
      });
    } catch (error: any) {
      console.error('Error updating stock:', error);
      toast({
        title: 'ເກີດຂໍ້ຜິດພາດ',
        description: error.message || 'ບໍ່ສາມາດອັບເດດສະຕ໊ອກໄດ້',
        variant: 'destructive',
      });
    }
  }, [products, toast]);

  const importProducts = useCallback(async (productsData: Partial<Product>[]) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .upsert(
          productsData.map(p => ({
            barcode: p.barcode,
            name: p.name!,
            description: p.description,
            cost_price: p.cost_price || 0,
            selling_price: p.selling_price || 0,
            stock_quantity: p.stock_quantity || 0,
            min_stock_level: p.min_stock_level || 0,
            unit: p.unit || 'ชิ้น',
            is_active: p.is_active ?? true,
          })),
          { onConflict: 'barcode' }
        )
        .select();

      if (error) throw error;
      await fetchProducts();
      toast({
        title: 'ສຳເລັດ',
        description: `ນຳເຂົ້າສິນຄ້າ ${data?.length || 0} ລາຍການແລ້ວ`,
      });
      return data;
    } catch (error: any) {
      console.error('Error importing products:', error);
      toast({
        title: 'ເກີດຂໍ້ຜິດພາດ',
        description: error.message || 'ບໍ່ສາມາດນຳເຂົ້າສິນຄ້າໄດ້',
        variant: 'destructive',
      });
      return null;
    }
  }, [fetchProducts, toast]);

  const getProductByBarcode = useCallback((barcode: string) => {
    return products.find(p => p.barcode === barcode && p.is_active);
  }, [products]);

  return {
    products,
    categories,
    loading,
    addProduct,
    updateProduct,
    deleteProduct,
    addCategory,
    updateStock,
    importProducts,
    getProductByBarcode,
    refetch: fetchProducts,
  };
}
