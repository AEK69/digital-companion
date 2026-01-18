import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Package, Store } from 'lucide-react';

interface PublicProduct {
  id: string;
  name: string;
  description: string | null;
  selling_price: number;
  stock_quantity: number;
  image_url: string | null;
  unit: string;
  category_id: string | null;
}

interface ProductCategory {
  id: string;
  name: string;
}

interface StoreSettings {
  name: string;
  logo: string | null;
  address: string | null;
  phone: string | null;
}

export default function PublicProducts() {
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch products (only active ones with stock)
        const { data: productsData } = await supabase
          .from('products')
          .select('id, name, description, selling_price, stock_quantity, image_url, unit, category_id')
          .eq('is_active', true)
          .gt('stock_quantity', 0)
          .order('name');

        // Fetch categories
        const { data: categoriesData } = await supabase
          .from('product_categories')
          .select('id, name')
          .order('name');

        // Fetch store settings
        const { data: storeData } = await supabase
          .from('store_settings')
          .select('name, logo, address, phone')
          .limit(1)
          .single();

        setProducts(productsData || []);
        setCategories(categoriesData || []);
        setStoreSettings(storeData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = !searchQuery || 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || product.category_id === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Get category name
  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return 'ບໍ່ມີໝວດ';
    const category = categories.find(c => c.id === categoryId);
    return category?.name || 'ບໍ່ມີໝວດ';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">ກຳລັງໂຫລດ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            {storeSettings?.logo ? (
              <img 
                src={storeSettings.logo} 
                alt={storeSettings.name} 
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Store className="h-5 w-5 text-primary" />
              </div>
            )}
            <div>
              <h1 className="font-bold text-xl">{storeSettings?.name || 'ຮ້ານຂອງພວກເຮົາ'}</h1>
              {storeSettings?.phone && (
                <p className="text-sm text-muted-foreground">ໂທ: {storeSettings.phone}</p>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Search and Filter */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ຄົ້ນຫາສິນຄ້າ..."
              className="pl-10"
            />
          </div>
          
          {/* Category filter */}
          <ScrollArea className="w-full">
            <div className="flex gap-2 pb-2">
              <Badge
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                className="cursor-pointer whitespace-nowrap"
                onClick={() => setSelectedCategory('all')}
              >
                ທັງໝົດ ({products.length})
              </Badge>
              {categories.map(category => {
                const count = products.filter(p => p.category_id === category.id).length;
                if (count === 0) return null;
                return (
                  <Badge
                    key={category.id}
                    variant={selectedCategory === category.id ? 'default' : 'outline'}
                    className="cursor-pointer whitespace-nowrap"
                    onClick={() => setSelectedCategory(category.id)}
                  >
                    {category.name} ({count})
                  </Badge>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">ບໍ່ພົບສິນຄ້າ</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredProducts.map(product => (
              <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-square relative bg-muted">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-12 h-12 text-muted-foreground/50" />
                    </div>
                  )}
                  <Badge 
                    variant="secondary" 
                    className="absolute top-2 right-2 text-xs"
                  >
                    ເຫຼືອ {product.stock_quantity} {product.unit}
                  </Badge>
                </div>
                <CardContent className="p-3">
                  <p className="font-medium text-sm line-clamp-2 mb-1">{product.name}</p>
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                    {getCategoryName(product.category_id)}
                  </p>
                  <p className="text-primary font-bold">
                    ₭{product.selling_price.toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Product count */}
        <div className="text-center text-sm text-muted-foreground mt-8">
          ສິນຄ້າທັງໝົດ {filteredProducts.length} ລາຍການ
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 mt-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          {storeSettings?.address && (
            <p className="mb-2">📍 {storeSettings.address}</p>
          )}
          <p>© {new Date().getFullYear()} {storeSettings?.name || 'Store'}</p>
        </div>
      </footer>
    </div>
  );
}
