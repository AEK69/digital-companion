import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Package, 
  Plus, 
  Minus, 
  History,
  AlertTriangle,
  ArrowUpCircle,
  ArrowDownCircle,
  Search
} from 'lucide-react';
import { Product, useProducts } from '@/hooks/useProducts';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface InventoryTransaction {
  id: string;
  product_id: string;
  type: string;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  note: string | null;
  created_at: string;
}

export function InventoryTab() {
  const { products, updateStock } = useProducts();
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showStockDialog, setShowStockDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [stockAction, setStockAction] = useState<'in' | 'adjustment'>('in');
  const [quantity, setQuantity] = useState(0);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const { data, error } = await supabase
          .from('inventory_transactions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) throw error;
        setTransactions(data || []);
      } catch (error) {
        console.error('Error fetching transactions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  const handleOpenStockDialog = (product: Product, action: 'in' | 'adjustment') => {
    setSelectedProduct(product);
    setStockAction(action);
    setQuantity(0);
    setNote('');
    setShowStockDialog(true);
  };

  const handleUpdateStock = async () => {
    if (!selectedProduct || quantity === 0) return;

    const change = stockAction === 'in' ? quantity : quantity - selectedProduct.stock_quantity;
    await updateStock(selectedProduct.id, change, stockAction, note || undefined);
    
    // Refresh transactions
    const { data } = await supabase
      .from('inventory_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    
    setTransactions(data || []);
    setShowStockDialog(false);
  };

  const filteredProducts = products.filter(p => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(query) || 
           p.barcode?.toLowerCase().includes(query);
  });

  const getProductName = (productId: string) => {
    const product = products.find(p => p.id === productId);
    return product?.name || 'Unknown';
  };

  const lowStockProducts = products.filter(p => p.stock_quantity <= p.min_stock_level);
  const totalStockValue = products.reduce((sum, p) => sum + (p.stock_quantity * p.cost_price), 0);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">ສິນຄ້າທັງໝົດ</p>
                <p className="text-2xl font-bold">{products.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={lowStockProducts.length > 0 ? 'border-destructive' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className={`w-8 h-8 ${lowStockProducts.length > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
              <div>
                <p className="text-sm text-muted-foreground">ສິນຄ້າໃກ້ໝົດ</p>
                <p className="text-2xl font-bold">{lowStockProducts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">ມູນຄ່າສະຕ໊ອກ</p>
                <p className="text-2xl font-bold">₭{totalStockValue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Stock Levels */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              ລະດັບສະຕ໊ອກ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ຄົ້ນຫາສິນຄ້າ..."
                  className="pl-10"
                />
              </div>
            </div>
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ສິນຄ້າ</TableHead>
                    <TableHead className="text-right">ສະຕ໊ອກ</TableHead>
                    <TableHead className="text-right">ຈັດການ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map(product => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{product.barcode || 'ບໍ່ມີບາໂຄ້ດ'}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={product.stock_quantity <= product.min_stock_level ? 'destructive' : 'secondary'}>
                          {product.stock_quantity} {product.unit}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleOpenStockDialog(product, 'in')}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            ເພີ່ມ
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleOpenStockDialog(product, 'adjustment')}
                          >
                            <Minus className="w-3 h-3 mr-1" />
                            ປັບ
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              ປະຫວັດການເຄື່ອນໄຫວສະຕ໊ອກ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[450px]">
              <div className="space-y-2">
                {transactions.map(tx => (
                  <div key={tx.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                    {tx.type === 'in' ? (
                      <ArrowUpCircle className="w-5 h-5 text-green-600" />
                    ) : tx.type === 'out' ? (
                      <ArrowDownCircle className="w-5 h-5 text-red-600" />
                    ) : (
                      <History className="w-5 h-5 text-yellow-600" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{getProductName(tx.product_id)}</p>
                      <p className="text-xs text-muted-foreground">
                        {tx.previous_stock} → {tx.new_stock} ({tx.type === 'in' ? '+' : tx.type === 'out' ? '-' : ''}{tx.quantity})
                      </p>
                      {tx.note && <p className="text-xs text-muted-foreground italic">{tx.note}</p>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(tx.created_at), 'dd/MM HH:mm')}
                    </p>
                  </div>
                ))}
                {transactions.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">ຍັງບໍ່ມີປະຫວັດ</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Stock Update Dialog */}
      <Dialog open={showStockDialog} onOpenChange={setShowStockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {stockAction === 'in' ? 'ເພີ່ມສະຕ໊ອກ' : 'ປັບສະຕ໊ອກ'}
            </DialogTitle>
          </DialogHeader>
          
          {selectedProduct && (
            <div className="space-y-4">
              <div className="p-4 bg-secondary rounded-lg">
                <p className="font-medium">{selectedProduct.name}</p>
                <p className="text-sm text-muted-foreground">
                  ສະຕ໊ອກປັດຈຸບັນ: {selectedProduct.stock_quantity} {selectedProduct.unit}
                </p>
              </div>

              <div className="space-y-2">
                <Label>
                  {stockAction === 'in' ? 'ຈຳນວນທີ່ເພີ່ມ' : 'ຈຳນວນໃໝ່'}
                </Label>
                <Input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  min={0}
                />
                {stockAction === 'in' && quantity > 0 && (
                  <p className="text-sm text-green-600">
                    ສະຕ໊ອກໃໝ່: {selectedProduct.stock_quantity + quantity} {selectedProduct.unit}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>ໝາຍເຫດ</Label>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="ເຊັ່ນ: ຊື້ເພີ່ມຈາກຮ້ານສົ່ງ..."
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStockDialog(false)}>
              ຍົກເລີກ
            </Button>
            <Button onClick={handleUpdateStock} disabled={quantity === 0}>
              ບັນທຶກ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
