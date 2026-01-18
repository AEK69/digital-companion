import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  Search, 
  Barcode,
  CreditCard,
  Banknote,
  QrCode,
  Printer,
  Package,
  Camera,
  Download
} from 'lucide-react';
import { Product, useProducts } from '@/hooks/useProducts';
import { CartItem, useSales } from '@/hooks/useSales';
import { useToast } from '@/hooks/use-toast';
import { Employee, StoreInfo } from '@/types';
import { BarcodeScanner } from './BarcodeScanner';
import { printReceipt, downloadReceipt } from '@/utils/receiptPrinter';

interface POSTabProps {
  employees: Employee[];
  storeInfo: StoreInfo;
}

export function POSTab({ employees, storeInfo }: POSTabProps) {
  const { products, getProductByBarcode, refetch: refetchProducts } = useProducts();
  const { createSale, getSaleItems } = useSales();
  const { toast } = useToast();
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [receivedAmount, setReceivedAmount] = useState(0);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [processing, setProcessing] = useState(false);
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [lastSale, setLastSale] = useState<{ sale: any; items: any[] } | null>(null);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const barcodeBufferRef = useRef<string>('');
  const barcodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Focus on barcode input
  useEffect(() => {
    if (barcodeInputRef.current && !showCheckout && !showCameraScanner) {
      barcodeInputRef.current.focus();
    }
  }, [showCheckout, showCameraScanner]);

  // Listen for barcode scanner input (keyboard events)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if in input field other than barcode input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' && target !== barcodeInputRef.current) {
        return;
      }

      // Clear previous timeout
      if (barcodeTimeoutRef.current) {
        clearTimeout(barcodeTimeoutRef.current);
      }

      // If Enter is pressed, process the barcode
      if (e.key === 'Enter' && barcodeBufferRef.current.length > 0) {
        e.preventDefault();
        const barcode = barcodeBufferRef.current.trim();
        barcodeBufferRef.current = '';
        
        if (barcode.length >= 3) {
          handleBarcodeDetected(barcode);
        }
        return;
      }

      // Add character to buffer (only printable characters)
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        barcodeBufferRef.current += e.key;
        
        // Auto-clear buffer after 100ms of no input (barcode scanners type fast)
        barcodeTimeoutRef.current = setTimeout(() => {
          barcodeBufferRef.current = '';
        }, 100);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (barcodeTimeoutRef.current) {
        clearTimeout(barcodeTimeoutRef.current);
      }
    };
  }, []);

  // Handle barcode detected (from scanner or camera)
  const handleBarcodeDetected = useCallback((barcode: string) => {
    const product = getProductByBarcode(barcode);
    if (product) {
      addToCart(product);
      toast({
        title: 'ເພີ່ມສິນຄ້າແລ້ວ',
        description: `${product.name} - ₭${product.selling_price.toLocaleString()}`,
      });
    } else {
      toast({
        title: 'ບໍ່ພົບສິນຄ້າ',
        description: `ບາໂຄ້ດ: ${barcode}`,
        variant: 'destructive',
      });
    }
    setBarcodeInput('');
  }, [getProductByBarcode, toast]);

  // Handle barcode form submit
  const handleBarcodeSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    handleBarcodeDetected(barcodeInput.trim());
  }, [barcodeInput, handleBarcodeDetected]);

  const addToCart = useCallback((product: Product) => {
    if (product.stock_quantity <= 0) {
      toast({
        title: 'ສິນຄ້າໝົດສະຕ໊ອກ',
        description: product.name,
        variant: 'destructive',
      });
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.product_id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock_quantity) {
          toast({
            title: 'ເກີນຈຳນວນສະຕ໊ອກ',
            description: `ມີສິນຄ້າໃນສະຕ໊ອກ ${product.stock_quantity} ຊິ້ນ`,
            variant: 'destructive',
          });
          return prev;
        }
        return prev.map(item =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + 1, total_price: (item.quantity + 1) * item.unit_price }
            : item
        );
      }
      return [...prev, {
        product_id: product.id,
        product_name: product.name,
        barcode: product.barcode,
        quantity: 1,
        unit_price: product.selling_price,
        total_price: product.selling_price,
        stock_quantity: product.stock_quantity,
      }];
    });
  }, [toast]);

  const updateCartItemQuantity = useCallback((productId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.product_id === productId) {
          const newQuantity = item.quantity + delta;
          if (newQuantity <= 0) return item;
          if (newQuantity > item.stock_quantity) {
            toast({
              title: 'ເກີນຈຳນວນສະຕ໊ອກ',
              description: `ມີສິນຄ້າໃນສະຕ໊ອກ ${item.stock_quantity} ຊິ້ນ`,
              variant: 'destructive',
            });
            return item;
          }
          return { ...item, quantity: newQuantity, total_price: newQuantity * item.unit_price };
        }
        return item;
      }).filter(item => item.quantity > 0);
    });
  }, [toast]);

  const removeFromCart = useCallback((productId: string) => {
    setCart(prev => prev.filter(item => item.product_id !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setDiscountAmount(0);
    setReceivedAmount(0);
  }, []);

  const cartTotal = cart.reduce((sum, item) => sum + item.total_price, 0);
  const finalTotal = cartTotal - discountAmount;
  const change = receivedAmount - finalTotal;

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    
    setProcessing(true);
    try {
      const sale = await createSale(
        cart,
        paymentMethod,
        discountAmount,
        selectedEmployee || undefined
      );

      if (sale) {
        // Get sale items for receipt
        const saleItems = await getSaleItems(sale.id);
        const selectedEmp = employees.find(e => e.id === selectedEmployee);
        
        // Store last sale for receipt printing
        setLastSale({ sale, items: saleItems || [] });
        
        // Auto-print receipt
        try {
          await printReceipt({
            sale,
            items: saleItems || [],
            employee: selectedEmp,
            storeInfo,
            receivedAmount: paymentMethod === 'cash' ? receivedAmount : undefined,
            changeAmount: paymentMethod === 'cash' ? change : undefined,
          });
        } catch (printError) {
          console.error('Print error:', printError);
          // Show receipt dialog if print fails
          setShowReceiptDialog(true);
        }
        
        clearCart();
        setShowCheckout(false);
        refetchProducts(); // Refresh stock
      }
    } finally {
      setProcessing(false);
    }
  };

  // Handle receipt actions
  const handlePrintReceipt = async () => {
    if (!lastSale) return;
    const selectedEmp = employees.find(e => e.id === lastSale.sale.employee_id);
    await printReceipt({
      sale: lastSale.sale,
      items: lastSale.items,
      employee: selectedEmp,
      storeInfo,
    });
  };

  const handleDownloadReceipt = () => {
    if (!lastSale) return;
    const selectedEmp = employees.find(e => e.id === lastSale.sale.employee_id);
    downloadReceipt({
      sale: lastSale.sale,
      items: lastSale.items,
      employee: selectedEmp,
      storeInfo,
    });
  };

  // Filter products
  const filteredProducts = products.filter(p => {
    if (!p.is_active) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return p.name.toLowerCase().includes(query) || 
             p.barcode?.toLowerCase().includes(query);
    }
    return true;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-200px)]">
      {/* Products Section */}
      <div className="lg:col-span-2 space-y-4">
        {/* Barcode Scanner Input */}
        <Card>
          <CardContent className="p-4">
            <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  ref={barcodeInputRef}
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="ສະແກນບາໂຄ້ດ ຫຼື ພິມລະຫັດສິນຄ້າ..."
                  className="pl-10"
                />
              </div>
              <Button type="submit" variant="secondary">
                <Search className="w-4 h-4 mr-2" />
                ຄົ້ນຫາ
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowCameraScanner(true)}>
                <Camera className="w-4 h-4 mr-2" />
                ສະແກນກ້ອງ
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Camera Scanner */}
        <BarcodeScanner
          isOpen={showCameraScanner}
          onClose={() => setShowCameraScanner(false)}
          onScan={(barcode) => {
            handleBarcodeDetected(barcode);
            setShowCameraScanner(false);
          }}
        />

        {/* Search & Filter */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ຄົ້ນຫາສິນຄ້າ..."
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Products Grid */}
        <Card className="flex-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="w-5 h-5" />
              ສິນຄ້າ ({filteredProducts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {filteredProducts.map(product => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    disabled={product.stock_quantity <= 0}
                    className={`p-3 rounded-lg border text-left transition-all hover:shadow-md ${
                      product.stock_quantity <= 0 
                        ? 'opacity-50 cursor-not-allowed bg-muted' 
                        : 'hover:border-primary cursor-pointer'
                    }`}
                  >
                    {product.image_url ? (
                      <img 
                        src={product.image_url} 
                        alt={product.name}
                        className="w-full h-20 object-cover rounded mb-2"
                      />
                    ) : (
                      <div className="w-full h-20 bg-muted rounded mb-2 flex items-center justify-center">
                        <Package className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    <p className="font-medium text-sm line-clamp-2">{product.name}</p>
                    <p className="text-primary font-bold text-sm mt-1">
                      ₭{product.selling_price.toLocaleString()}
                    </p>
                    <Badge 
                      variant={product.stock_quantity <= product.min_stock_level ? 'destructive' : 'secondary'}
                      className="mt-1 text-xs"
                    >
                      ເຫຼືອ {product.stock_quantity} {product.unit}
                    </Badge>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Cart Section */}
      <Card className="flex flex-col h-full">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              ຕະກ້າສິນຄ້າ
            </span>
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearCart}>
                <Trash2 className="w-4 h-4 mr-1" />
                ລ້າງ
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <ScrollArea className="flex-1 mb-4">
            {cart.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>ຍັງບໍ່ມີສິນຄ້າໃນຕະກ້າ</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map(item => (
                  <div key={item.product_id} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.product_name}</p>
                      <p className="text-xs text-muted-foreground">
                        ₭{item.unit_price.toLocaleString()} x {item.quantity}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-7 w-7"
                        onClick={() => updateCartItemQuantity(item.product_id, -1)}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-7 w-7"
                        onClick={() => updateCartItemQuantity(item.product_id, 1)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    <p className="font-medium text-sm w-20 text-right">
                      ₭{item.total_price.toLocaleString()}
                    </p>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 text-destructive"
                      onClick={() => removeFromCart(item.product_id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Cart Summary */}
          <div className="border-t pt-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span>ລວມ ({cart.reduce((sum, i) => sum + i.quantity, 0)} ລາຍການ)</span>
              <span>₭{cartTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-bold text-lg">
              <span>ຍອດຮວມສຸດທິ</span>
              <span className="text-primary">₭{finalTotal.toLocaleString()}</span>
            </div>
            <Button 
              className="w-full" 
              size="lg"
              disabled={cart.length === 0}
              onClick={() => setShowCheckout(true)}
            >
              <CreditCard className="w-5 h-5 mr-2" />
              ຊຳລະເງິນ
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Checkout Dialog */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>ຊຳລະເງິນ</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-center p-4 bg-primary/10 rounded-lg">
              <p className="text-sm text-muted-foreground">ຍອດຮວມສຸດທິ</p>
              <p className="text-3xl font-bold text-primary">₭{finalTotal.toLocaleString()}</p>
            </div>

            <div className="space-y-2">
              <Label>ພະນັກງານ</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="ເລືອກພະນັກງານ" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>ວິທີຊຳລະ</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod('cash')}
                  className="flex flex-col h-auto py-3"
                >
                  <Banknote className="w-5 h-5 mb-1" />
                  <span className="text-xs">ເງິນສົດ</span>
                </Button>
                <Button
                  variant={paymentMethod === 'transfer' ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod('transfer')}
                  className="flex flex-col h-auto py-3"
                >
                  <CreditCard className="w-5 h-5 mb-1" />
                  <span className="text-xs">ໂອນ</span>
                </Button>
                <Button
                  variant={paymentMethod === 'qr' ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod('qr')}
                  className="flex flex-col h-auto py-3"
                >
                  <QrCode className="w-5 h-5 mb-1" />
                  <span className="text-xs">QR Code</span>
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ສ່ວນຫຼຸດ</Label>
                <Input
                  type="number"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(Number(e.target.value))}
                  min={0}
                  max={cartTotal}
                />
              </div>
              <div className="space-y-2">
                <Label>ເງິນທີ່ຮັບ</Label>
                <Input
                  type="number"
                  value={receivedAmount}
                  onChange={(e) => setReceivedAmount(Number(e.target.value))}
                  min={0}
                />
              </div>
            </div>

            {receivedAmount >= finalTotal && (
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">ເງິນທອນ</p>
                <p className="text-2xl font-bold text-green-600">₭{change.toLocaleString()}</p>
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowCheckout(false)}>
              ຍົກເລີກ
            </Button>
            <Button 
              onClick={handleCheckout} 
              disabled={processing || (paymentMethod === 'cash' && receivedAmount < finalTotal)}
            >
              <Printer className="w-4 h-4 mr-2" />
              {processing ? 'ກຳລັງບັນທຶກ...' : 'ຢືນຢັນ & ພິມໃບບິນ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>ໃບບິນພ້ອມແລ້ວ</DialogTitle>
          </DialogHeader>
          
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mx-auto mb-4 flex items-center justify-center">
              <Printer className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-muted-foreground">ການຂາຍສຳເລັດແລ້ວ</p>
            {lastSale && (
              <p className="font-bold text-lg mt-2">{lastSale.sale.sale_number}</p>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={handleDownloadReceipt}>
              <Download className="w-4 h-4 mr-2" />
              ດາວໂຫລດ
            </Button>
            <Button className="flex-1" onClick={handlePrintReceipt}>
              <Printer className="w-4 h-4 mr-2" />
              ພິມໃບບິນ
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
