import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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
  Search,
  Mail,
  Loader2
} from 'lucide-react';
import { Product, useProducts } from '@/hooks/useProducts';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useStoreSettings } from '@/hooks/useStoreSettings';

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
  const { storeSettings } = useStoreSettings();
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showStockDialog, setShowStockDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [stockAction, setStockAction] = useState<'in' | 'adjustment'>('in');
  const [quantity, setQuantity] = useState(0);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

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

  const handleSendEmailAlert = async () => {
    if (!recipientEmail.trim()) {
      toast.error('ກະລຸນາປ້ອນ Email');
      return;
    }

    setSendingEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke('low-stock-alert', {
        body: {
          recipientEmail: recipientEmail.trim(),
          storeName: storeSettings.name,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`ສົ່ງແຈ້ງເຕືອນໄປ ${recipientEmail} ສຳເລັດ (${data.alertCount} ລາຍການ)`);
        setShowEmailDialog(false);
        setRecipientEmail('');
      } else {
        throw new Error(data?.error || 'ສົ່ງ Email ລົ້ມເຫຼວ');
      }
    } catch (error: any) {
      console.error('Email error:', error);
      toast.error(error.message || 'ສົ່ງ Email ລົ້ມເຫຼວ');
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col gap-2 p-2 overflow-hidden">
      {/* Summary Cards - Compact */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 shrink-0">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/20">
                <Package className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">ສິນຄ້າທັງໝົດ</p>
                <p className="text-lg font-bold">{products.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={lowStockProducts.length > 0 ? 'border-destructive/50' : ''}>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-destructive/20">
                <AlertTriangle className={`w-4 h-4 ${lowStockProducts.length > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">ໃກ້ໝົດ</p>
                <p className="text-lg font-bold">{lowStockProducts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/20">
                <Package className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">ມູນຄ່າສະຕ໊ອກ</p>
                <p className="text-base font-bold">₭{totalStockValue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/20">
                <Mail className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">ແຈ້ງເຕືອນ</p>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setShowEmailDialog(true)}
                  disabled={lowStockProducts.length === 0}
                  className="h-6 text-[10px] mt-0.5 px-2"
                >
                  <Mail className="w-3 h-3 mr-1" />
                  ສົ່ງ Email
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content - Full Height */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-2 min-h-0 overflow-hidden">
        {/* Stock Levels */}
        <Card className="flex flex-col min-h-0 overflow-hidden">
          <CardHeader className="py-2 px-3 shrink-0 border-b">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Package className="w-4 h-4" />
              ລະດັບສະຕ໊ອກ ({filteredProducts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-2 min-h-0 overflow-hidden">
            <div className="mb-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ຄົ້ນຫາສິນຄ້າ..."
                  className="pl-8 h-8 text-sm"
                />
              </div>
            </div>
            <ScrollArea className="h-[calc(100%-40px)]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="p-1 text-xs">ສິນຄ້າ</TableHead>
                    <TableHead className="text-right p-1 text-xs">ສະຕ໊ອກ</TableHead>
                    <TableHead className="text-right p-1 text-xs">ຈັດການ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map(product => (
                    <TableRow key={product.id} className="h-9">
                      <TableCell className="p-1">
                        <p className="font-medium text-xs truncate max-w-[150px]">{product.name}</p>
                        <p className="text-[10px] text-muted-foreground">{product.barcode || '-'}</p>
                      </TableCell>
                      <TableCell className="text-right p-1">
                        <Badge 
                          variant={product.stock_quantity <= product.min_stock_level ? 'destructive' : 'secondary'}
                          className="text-[10px] px-1"
                        >
                          {product.stock_quantity} {product.unit}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right p-1">
                        <div className="flex justify-end gap-0.5">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="h-6 text-[10px] px-1.5"
                            onClick={() => handleOpenStockDialog(product, 'in')}
                          >
                            <Plus className="w-3 h-3 mr-0.5" />
                            ເພີ່ມ
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="h-6 text-[10px] px-1.5"
                            onClick={() => handleOpenStockDialog(product, 'adjustment')}
                          >
                            <Minus className="w-3 h-3 mr-0.5" />
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
        <Card className="flex flex-col min-h-0 overflow-hidden">
          <CardHeader className="py-2 px-3 shrink-0 border-b">
            <CardTitle className="flex items-center gap-2 text-sm">
              <History className="w-4 h-4" />
              ປະຫວັດເຄື່ອນໄຫວ ({transactions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-2 min-h-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="space-y-1">
                {transactions.map(tx => (
                  <div key={tx.id} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50 text-sm">
                    {tx.type === 'in' ? (
                      <ArrowUpCircle className="w-4 h-4 text-green-600 shrink-0" />
                    ) : tx.type === 'out' ? (
                      <ArrowDownCircle className="w-4 h-4 text-red-600 shrink-0" />
                    ) : (
                      <History className="w-4 h-4 text-yellow-600 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs truncate">{getProductName(tx.product_id)}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {tx.previous_stock} → {tx.new_stock} ({tx.type === 'in' ? '+' : tx.type === 'out' ? '-' : ''}{tx.quantity})
                      </p>
                      {tx.note && <p className="text-[10px] text-muted-foreground italic truncate">{tx.note}</p>}
                    </div>
                    <p className="text-[10px] text-muted-foreground shrink-0">
                      {format(new Date(tx.created_at), 'dd/MM HH:mm')}
                    </p>
                  </div>
                ))}
                {transactions.length === 0 && (
                  <p className="text-center text-muted-foreground py-8 text-sm">ຍັງບໍ່ມີປະຫວັດ</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Stock Update Dialog */}
      <Dialog open={showStockDialog} onOpenChange={setShowStockDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">
              {stockAction === 'in' ? 'ເພີ່ມສະຕ໊ອກ' : 'ປັບສະຕ໊ອກ'}
            </DialogTitle>
          </DialogHeader>
          
          {selectedProduct && (
            <div className="space-y-3">
              <div className="p-3 bg-secondary rounded-lg">
                <p className="font-medium text-sm">{selectedProduct.name}</p>
                <p className="text-xs text-muted-foreground">
                  ສະຕ໊ອກປັດຈຸບັນ: {selectedProduct.stock_quantity} {selectedProduct.unit}
                </p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">
                  {stockAction === 'in' ? 'ຈຳນວນທີ່ເພີ່ມ' : 'ຈຳນວນໃໝ່'}
                </Label>
                <Input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  min={0}
                  className="h-8 text-sm"
                />
                {stockAction === 'in' && quantity > 0 && (
                  <p className="text-xs text-green-600">
                    ສະຕ໊ອກໃໝ່: {selectedProduct.stock_quantity + quantity} {selectedProduct.unit}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs">ໝາຍເຫດ</Label>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="ເຊັ່ນ: ຊື້ເພີ່ມຈາກຮ້ານສົ່ງ..."
                  rows={2}
                  className="text-sm"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowStockDialog(false)}>
              ຍົກເລີກ
            </Button>
            <Button size="sm" onClick={handleUpdateStock} disabled={quantity === 0}>
              ບັນທຶກ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Alert Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Mail className="w-4 h-4" />
              ແຈ້ງເຕືອນສິນຄ້າໃກ້ໝົດ
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3">
            <div className="p-3 bg-destructive/10 rounded-lg">
              <p className="text-xs text-destructive font-medium">
                ມີ {lowStockProducts.length} ສິນຄ້າທີ່ໃກ້ໝົດ
              </p>
              <ul className="mt-1 text-[10px] text-muted-foreground max-h-24 overflow-y-auto">
                {lowStockProducts.slice(0, 5).map(p => (
                  <li key={p.id}>• {p.name} (ເຫຼືອ {p.stock_quantity})</li>
                ))}
                {lowStockProducts.length > 5 && <li>ແລະອື່ນໆ...</li>}
              </ul>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Email ຜູ້ຮັບ</Label>
              <Input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="example@email.com"
                className="h-8 text-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowEmailDialog(false)}>
              ຍົກເລີກ
            </Button>
            <Button 
              size="sm"
              onClick={handleSendEmailAlert} 
              disabled={sendingEmail || !recipientEmail.trim()}
            >
              {sendingEmail ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ກຳລັງສົ່ງ...
                </>
              ) : (
                <>
                  <Mail className="w-3 h-3 mr-1" />
                  ສົ່ງ Email
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}