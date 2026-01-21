import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
  Download,
  User,
  Star,
  Check,
  Monitor,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { Product, useProducts } from '@/hooks/useProducts';
import { CartItem, useSales } from '@/hooks/useSales';
import { useCustomers, Customer } from '@/hooks/useCustomers';
import { useToast } from '@/hooks/use-toast';
import { Employee, StoreInfo } from '@/types';
import { BarcodeScanner } from './BarcodeScanner';
import { StockAlerts, useStockAlerts } from './StockAlerts';
import { printReceipt, downloadReceipt } from '@/utils/receiptPrinter';
import { useAuth } from '@/hooks/useAuth';
import { useDynamicQR } from '@/hooks/useDynamicQR';

interface POSTabProps {
  employees: Employee[];
  storeInfo: StoreInfo;
  onNavigateToInventory?: () => void;
}

// Quick cash denomination buttons (Lao Kip)
const QUICK_CASH_AMOUNTS = [1000, 2000, 5000, 10000, 20000, 50000, 100000];

// Bank options for QR payment
const BANK_OPTIONS = [
  { value: 'bcel', label: 'BCEL One Pay', logo: '🏦' },
  { value: 'ldb', label: 'LDB', logo: '🏛️' },
  { value: 'jdb', label: 'JDB', logo: '💳' },
];

// Fallback static QR Code
const STATIC_BCEL_QR = '00020101021115312738041800520446mch19B73F61B9E038570016A00526628466257701082771041802030020314mch19B73F61B9E5204569153034185802LA5916AKAPHON XAYYABED6002VT62120208586625406304C735';

export function POSTab({ employees, storeInfo, onNavigateToInventory }: POSTabProps) {
  const { products, getProductByBarcode, refetch: refetchProducts } = useProducts();
  const { createSale, getSaleItems } = useSales();
  const { customers, getCustomerByPhone, redeemPoints } = useCustomers();
  const { toast } = useToast();
  const { hasAlerts } = useStockAlerts(products);
  const { profile, user } = useAuth();
  const { loading: qrLoading, qrResult, generateQR, clearQR } = useDynamicQR();
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [receivedAmount, setReceivedAmount] = useState(0);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [usePoints, setUsePoints] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [lastSale, setLastSale] = useState<{ sale: any; items: any[] } | null>(null);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [shouldPrintReceipt, setShouldPrintReceipt] = useState(true);
  const [selectedBank, setSelectedBank] = useState<'bcel' | 'ldb' | 'jdb'>('bcel');
  const [showCustomerDisplay, setShowCustomerDisplay] = useState(false);
  const customerDisplayRef = useRef<Window | null>(null);
  
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const barcodeBufferRef = useRef<string>('');
  const barcodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // cartTotal is defined later, so we need to move this effect after it
  // This effect is moved below after cartTotal definition

  // Customer Display window management
  const openCustomerDisplay = useCallback(() => {
    if (customerDisplayRef.current && !customerDisplayRef.current.closed) {
      customerDisplayRef.current.focus();
      return;
    }
    
    const displayWindow = window.open(
      '', 
      'CustomerDisplay', 
      'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no'
    );
    
    if (displayWindow) {
      customerDisplayRef.current = displayWindow;
      setShowCustomerDisplay(true);
      
      // Watch for window close
      const checkClosed = setInterval(() => {
        if (displayWindow.closed) {
          setShowCustomerDisplay(false);
          customerDisplayRef.current = null;
          clearInterval(checkClosed);
        }
      }, 500);
    }
  }, []);

  // Customer display effect moved below after cartTotal is defined

  // Auto-fill employee based on logged-in user
  useEffect(() => {
    if (user && profile && employees.length > 0 && !selectedEmployee) {
      // Find employee that matches the current user
      const matchingEmployee = employees.find(emp =>
        emp.name === profile.full_name || 
        emp.name.toLowerCase().includes(profile.full_name.toLowerCase())
      );
      if (matchingEmployee) {
        setSelectedEmployee(matchingEmployee.id);
      }
    }
  }, [user, profile, employees, selectedEmployee]);

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
  }, [getProductByBarcode, addToCart, toast]);

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
  }, [handleBarcodeDetected]);

  // Handle barcode form submit
  const handleBarcodeSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    handleBarcodeDetected(barcodeInput.trim());
  }, [barcodeInput, handleBarcodeDetected]);

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
    setSelectedCustomer(null);
    setCustomerSearch('');
    setUsePoints(false);
  }, []);

  const cartTotal = cart.reduce((sum, item) => sum + item.total_price, 0);
  const finalTotal = cartTotal - discountAmount;
  
  // Calculate points discount
  const pointsDiscount = usePoints && selectedCustomer 
    ? Math.min(selectedCustomer.loyalty_points * 100, finalTotal)
    : 0;
  const actualFinalTotal = finalTotal - pointsDiscount;
  const actualChange = receivedAmount - actualFinalTotal;
  const change = actualChange;

  // Update customer display content when cart changes
  useEffect(() => {
    const displayWindow = customerDisplayRef.current;
    if (!displayWindow || displayWindow.closed) return;

    const actualTotal = actualFinalTotal;

    displayWindow.document.body.innerHTML = `
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Noto Sans Lao', 'Segoe UI', sans-serif; }
        body { background: linear-gradient(135deg, hsl(200 98% 96%), hsl(0 0% 100%), hsl(140 80% 96%)); min-height: 100vh; }
        .header { background: linear-gradient(135deg, hsl(199 89% 48%), hsl(199 89% 40%)); color: white; padding: 24px; }
        .header-content { display: flex; justify-content: space-between; align-items: center; }
        .store-info h1 { font-size: 2rem; font-weight: bold; }
        .store-info p { opacity: 0.9; }
        .time { text-align: right; }
        .time .clock { font-size: 2.5rem; font-weight: bold; font-family: monospace; }
        .time .date { opacity: 0.9; }
        .main { display: flex; height: calc(100vh - 120px); }
        .cart-section { flex: 1; padding: 24px; overflow-y: auto; }
        .cart-section h2 { font-size: 1.5rem; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
        .cart-item { background: white; border-radius: 12px; padding: 16px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
        .item-info { display: flex; align-items: center; gap: 16px; }
        .item-icon { width: 48px; height: 48px; background: hsl(200 98% 92%); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 24px; }
        .item-name { font-weight: 600; font-size: 1.1rem; }
        .item-price { color: hsl(215 16% 47%); }
        .item-total { font-size: 1.25rem; font-weight: bold; color: hsl(199 89% 48%); }
        .total-section { width: 360px; background: white; border-left: 1px solid hsl(214 32% 91%); padding: 24px; display: flex; flex-direction: column; justify-content: center; }
        .total-display { text-align: center; }
        .total-label { color: hsl(215 16% 47%); font-size: 1.25rem; }
        .total-amount { font-size: 4rem; font-weight: bold; color: hsl(199 89% 48%); margin: 16px 0; }
        .discount { color: hsl(142 71% 45%); font-size: 1.25rem; margin-bottom: 8px; }
        .welcome { text-align: center; padding: 100px; color: hsl(215 16% 47%); }
        .welcome-icon { font-size: 6rem; opacity: 0.3; margin-bottom: 24px; }
        .welcome-text { font-size: 2rem; }
        .footer { text-align: center; padding: 16px; color: hsl(215 20% 65%); font-size: 0.875rem; }
      </style>
      <div class="header">
        <div class="header-content">
          <div class="store-info">
            <h1>${storeInfo.name || 'ຮ້ານຂອງຂ້ອຍ'}</h1>
            ${storeInfo.phone ? `<p>📞 ${storeInfo.phone}</p>` : ''}
          </div>
          <div class="time">
            <div class="clock">${new Date().toLocaleTimeString('lo-LA', { hour: '2-digit', minute: '2-digit' })}</div>
            <div class="date">${new Date().toLocaleDateString('lo-LA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
          </div>
        </div>
      </div>
      <div class="main">
        ${cart.length === 0 ? `
          <div class="welcome" style="flex:1;">
            <div class="welcome-icon">🛒</div>
            <div class="welcome-text">ຍິນດີຕ້ອນຮັບ</div>
            <p style="margin-top: 8px;">ກະລຸນາເລືອກສິນຄ້າ</p>
          </div>
        ` : `
          <div class="cart-section">
            <h2>🛒 ລາຍການສິນຄ້າ (${cart.reduce((sum, i) => sum + i.quantity, 0)} ລາຍການ)</h2>
            ${cart.map(item => `
              <div class="cart-item">
                <div class="item-info">
                  <div class="item-icon">📦</div>
                  <div>
                    <div class="item-name">${item.product_name}</div>
                    <div class="item-price">₭${item.unit_price.toLocaleString()} × ${item.quantity}</div>
                  </div>
                </div>
                <div class="item-total">₭${item.total_price.toLocaleString()}</div>
              </div>
            `).join('')}
          </div>
          <div class="total-section">
            <div class="total-display">
              <div class="total-label">ຍອດລວມ</div>
              <div class="total-amount">₭${actualTotal.toLocaleString()}</div>
              ${pointsDiscount > 0 ? `<div class="discount">ສ່ວນຫຼຸດຄະແນນ: -₭${pointsDiscount.toLocaleString()}</div>` : ''}
              ${discountAmount > 0 ? `<div class="discount">ສ່ວນຫຼຸດ: -₭${discountAmount.toLocaleString()}</div>` : ''}
            </div>
            <div class="footer">
              ຂອບໃຈທີ່ໃຊ້ບໍລິການ
              ${storeInfo.address ? `<br/>${storeInfo.address}` : ''}
            </div>
          </div>
        `}
      </div>
    `;
  }, [cart, actualFinalTotal, pointsDiscount, discountAmount, storeInfo]);

  // Handle quick cash amount
  const handleQuickCash = (amount: number) => {
    setReceivedAmount(prev => prev + amount);
  };

  // Set exact amount
  const handleExactAmount = () => {
    setReceivedAmount(actualFinalTotal);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    
    setProcessing(true);
    try {
      // Calculate points to redeem
      const pointsToRedeem = pointsDiscount > 0 ? Math.ceil(pointsDiscount / 100) : 0;
      
      const sale = await createSale(
        cart,
        paymentMethod,
        discountAmount,
        selectedEmployee || undefined,
        undefined,
        selectedCustomer?.id,
        pointsDiscount
      );

      if (sale) {
        // Redeem points if used
        if (pointsToRedeem > 0 && selectedCustomer) {
          await redeemPoints(selectedCustomer.id, pointsToRedeem);
        }
        
        // Get sale items for receipt
        const saleItems = await getSaleItems(sale.id);
        const selectedEmp = employees.find(e => e.id === selectedEmployee);
        
        // Store last sale for receipt printing
        setLastSale({ sale, items: saleItems || [] });
        
        // Print receipt if enabled
        if (shouldPrintReceipt) {
          try {
            await printReceipt({
              sale,
              items: saleItems || [],
              employee: selectedEmp,
              storeInfo,
              receivedAmount: paymentMethod === 'cash' ? receivedAmount : undefined,
              changeAmount: paymentMethod === 'cash' ? actualChange : undefined,
              customer: selectedCustomer || undefined,
              pointsDiscount: pointsDiscount > 0 ? pointsDiscount : undefined,
            });
          } catch (printError) {
            console.error('Print error:', printError);
            // Show receipt dialog if print fails
            setShowReceiptDialog(true);
          }
        }
        
        toast({
          title: 'ຂາຍສຳເລັດ!',
          description: `ເລກທີ່ໃບບິນ: ${sale.sale_number}`,
        });
        
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

  // Filter customers
  const filteredCustomers = customerSearch
    ? customers.filter(c => 
        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.phone?.includes(customerSearch)
      )
    : [];

  return (
    <div className="space-y-4 h-[calc(100vh-120px)] flex flex-col">
      {/* Stock Alerts */}
      {hasAlerts && (
        <StockAlerts products={products} onNavigateToInventory={onNavigateToInventory} />
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 flex-1 min-h-0">
      {/* Products Section - Takes more space on desktop */}
      <div className="xl:col-span-8 space-y-4 flex flex-col min-h-0">
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
              <Button 
                type="button" 
                variant={showCustomerDisplay ? 'default' : 'outline'} 
                onClick={openCustomerDisplay}
                title="ເປີດຈໍສະແດງລາຄາໃຫ້ລູກຄ້າ"
              >
                <Monitor className="w-4 h-4 mr-2" />
                {showCustomerDisplay ? 'ຈໍລູກຄ້າເປີດຢູ່' : 'ຈໍລູກຄ້າ'}
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

        {/* Products Grid - Flexible height */}
        <Card className="flex-1 min-h-0 flex flex-col">
          <CardHeader className="pb-2 shrink-0">
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="w-5 h-5" />
              ສິນຄ້າ ({filteredProducts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 p-4">
            <ScrollArea className="h-full">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
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

      {/* Cart Section - Fixed width on desktop */}
      <Card className="xl:col-span-4 flex flex-col min-h-0">
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
        <DialogContent className="max-w-lg max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>ຊຳລະເງິນ</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Customer Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="w-4 h-4" />
                ລູກຄ້າ (ເພື່ອສະສົມຄະແນນ)
              </Label>
              <div className="relative">
                <Input
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    if (!e.target.value) setSelectedCustomer(null);
                  }}
                  placeholder="ຄົ້ນຫາດ້ວຍຊື່ ຫຼື ເບີໂທ..."
                />
                {customerSearch && filteredCustomers.length > 0 && !selectedCustomer && (
                  <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-40 overflow-y-auto">
                    {filteredCustomers.slice(0, 5).map(customer => (
                      <button
                        key={customer.id}
                        type="button"
                        className="w-full px-3 py-2 text-left hover:bg-muted flex justify-between items-center"
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setCustomerSearch(customer.name);
                        }}
                      >
                        <div>
                          <p className="font-medium text-sm">{customer.name}</p>
                          <p className="text-xs text-muted-foreground">{customer.phone}</p>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-yellow-600">
                          <Star className="w-3 h-3 fill-current" />
                          {customer.loyalty_points}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedCustomer && (
                <div className="p-3 bg-secondary rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{selectedCustomer.name}</p>
                      <p className="text-xs text-muted-foreground">{selectedCustomer.phone}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-yellow-600">
                        <Star className="w-4 h-4 fill-current" />
                        <span className="font-bold">{selectedCustomer.loyalty_points}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">ຄະແນນ</p>
                    </div>
                  </div>
                  {selectedCustomer.loyalty_points > 0 && (
                    <div className="mt-2 pt-2 border-t">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="use-points"
                            checked={usePoints}
                            onChange={(e) => setUsePoints(e.target.checked)}
                            className="rounded border-primary"
                          />
                          <Label htmlFor="use-points" className="text-sm cursor-pointer">
                            ໃຊ້ຄະແນນເປັນສ່ວນຫຼຸດ
                          </Label>
                        </div>
                        {usePoints && (
                          <span className="text-sm text-green-600 font-medium">
                            -₭{Math.min(selectedCustomer.loyalty_points * 100, cartTotal - discountAmount).toLocaleString()}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        (1 ຄະແນນ = ₭100 ສ່ວນຫຼຸດ)
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="text-center p-4 bg-primary/10 rounded-lg">
              <p className="text-sm text-muted-foreground">ຍອດຮວມສຸດທິ</p>
              <p className="text-3xl font-bold text-primary">₭{actualFinalTotal.toLocaleString()}</p>
              {pointsDiscount > 0 && (
                <p className="text-sm text-green-600">
                  (ສ່ວນຫຼຸດຈາກຄະແນນ: ₭{pointsDiscount.toLocaleString()})
                </p>
              )}
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
                  type="button"
                  variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod('cash')}
                  className="flex flex-col h-auto py-3"
                >
                  <Banknote className="w-5 h-5 mb-1" />
                  <span className="text-xs">ເງິນສົດ</span>
                </Button>
                <Button
                  type="button"
                  variant={paymentMethod === 'transfer' ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod('transfer')}
                  className="flex flex-col h-auto py-3"
                >
                  <CreditCard className="w-5 h-5 mb-1" />
                  <span className="text-xs">ໂອນ</span>
                </Button>
                <Button
                  type="button"
                  variant={paymentMethod === 'qr' ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod('qr')}
                  className="flex flex-col h-auto py-3"
                >
                  <QrCode className="w-5 h-5 mb-1" />
                  <span className="text-xs">QR Code</span>
                </Button>
              </div>
            </div>

            {/* QR Code Display for QR Payment */}
            {paymentMethod === 'qr' && (
              <div className="p-4 bg-secondary rounded-lg text-center space-y-3">
                <div className="flex justify-center gap-2 mb-2">
                  {BANK_OPTIONS.map(bank => (
                    <Button
                      key={bank.value}
                      type="button"
                      variant={selectedBank === bank.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedBank(bank.value as 'bcel' | 'ldb' | 'jdb')}
                    >
                      {bank.logo} {bank.label}
                    </Button>
                  ))}
                </div>
                
                <p className="font-medium">ສະແກນ QR ເພື່ອຊຳລະເງິນ</p>
                
                <div className="bg-white p-4 rounded-lg inline-block min-h-[200px] min-w-[200px] flex items-center justify-center">
                  {qrLoading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">ກຳລັງສ້າງ QR...</span>
                    </div>
                  ) : qrResult?.qrCode ? (
                    <img 
                      src={qrResult.qrCode}
                      alt="Payment QR Code"
                      className="w-48 h-48 mx-auto"
                    />
                  ) : (
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(STATIC_BCEL_QR)}`}
                      alt="BCEL QR Code"
                      className="w-48 h-48 mx-auto"
                    />
                  )}
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground">
                    {BANK_OPTIONS.find(b => b.value === selectedBank)?.label || 'BCEL One Pay'}
                  </p>
                  <p className="text-2xl font-bold text-primary">₭{actualFinalTotal.toLocaleString()}</p>
                  {qrResult?.reference && (
                    <p className="text-xs text-muted-foreground mt-1">Ref: {qrResult.reference}</p>
                  )}
                </div>

                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const ref = `POS-${Date.now().toString().slice(-8)}`;
                    generateQR(actualFinalTotal, ref, `ຊຳລະສິນຄ້າ`, selectedBank);
                  }}
                  disabled={qrLoading}
                >
                  <RefreshCw className={`w-4 h-4 mr-1 ${qrLoading ? 'animate-spin' : ''}`} />
                  ສ້າງ QR ໃໝ່
                </Button>
              </div>
            )}

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

            {/* Quick Cash Buttons */}
            {paymentMethod === 'cash' && (
              <div className="space-y-2">
                <Label>ກົດເລືອກເງິນດ່ວນ (₭)</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleExactAmount}
                    className="text-green-600 border-green-600"
                  >
                    <Check className="w-3 h-3 mr-1" />
                    ພໍດີ
                  </Button>
                  {QUICK_CASH_AMOUNTS.map(amount => (
                    <Button
                      key={amount}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickCash(amount)}
                    >
                      +{amount.toLocaleString()}
                    </Button>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setReceivedAmount(0)}
                  className="text-muted-foreground"
                >
                  ລ້າງ
                </Button>
              </div>
            )}

            {receivedAmount >= actualFinalTotal && paymentMethod === 'cash' && (
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">ເງິນທອນ</p>
                <p className="text-2xl font-bold text-green-600">₭{actualChange.toLocaleString()}</p>
              </div>
            )}

            {/* Print Receipt Option */}
            <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
              <Label htmlFor="print-receipt" className="flex items-center gap-2 cursor-pointer">
                <Printer className="w-4 h-4" />
                ພິມໃບບິນຫຼັງຂາຍ
              </Label>
              <Switch
                id="print-receipt"
                checked={shouldPrintReceipt}
                onCheckedChange={setShouldPrintReceipt}
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowCheckout(false)}>
              ຍົກເລີກ
            </Button>
            <Button 
              onClick={handleCheckout} 
              disabled={processing || (paymentMethod === 'cash' && receivedAmount < actualFinalTotal)}
            >
              {shouldPrintReceipt && <Printer className="w-4 h-4 mr-2" />}
              {processing ? 'ກຳລັງບັນທຶກ...' : (shouldPrintReceipt ? 'ຢືນຢັນ & ພິມໃບບິນ' : 'ຢືນຢັນການຂາຍ')}
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
    </div>
  );
}
