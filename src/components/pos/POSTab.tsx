import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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
  Ticket,
  Tag
} from 'lucide-react';
import { Product, useProducts } from '@/hooks/useProducts';
import { CartItem, useSales } from '@/hooks/useSales';
import { useCustomers, Customer } from '@/hooks/useCustomers';
import { usePromotions, Coupon } from '@/hooks/usePromotions';
import { useOfflineSales } from '@/hooks/useOfflineSales';
import { useProductVariants, ProductVariant } from '@/hooks/useProductVariants';
import { useToast } from '@/hooks/use-toast';
import { Employee, StoreInfo } from '@/types';
import { BarcodeScanner } from './BarcodeScanner';
import { StockAlerts, useStockAlerts } from './StockAlerts';
import { OfflineIndicator } from './OfflineIndicator';
import { ProductVariantDialog } from './ProductVariantDialog';
import { CartItemVariantSelector } from './CartItemVariantSelector';
import { printReceipt, downloadReceipt } from '@/utils/receiptPrinter';
import { useAuth } from '@/hooks/useAuth';

interface POSTabProps {
  employees: Employee[];
  storeInfo: StoreInfo;
  onNavigateToInventory?: () => void;
}

const QUICK_CASH_AMOUNTS = [1000, 2000, 5000, 10000, 20000, 50000, 100000];

const ONEPAY_STATIC_QR = "00020101021115312738041800520446mch19B73F61B9E038570016A00526628466257701082771041802030020314mch19B73F61B9E5204569153034185802LA5916AKAPHON XAYYABED6002VT62120208586625406304C735";
const ONEPAY_BASE_URL = "https://api.qrserver.com/v1/create-qr-code/?size=200x200&ecc=H&data=";

function generateOnePayDynamicQR(amount: number): { qrCodeUrl: string, link: string, raw: string } {
  const amountStr = amount.toFixed(2);
  const EMVamount = "54" + String(amountStr.length).padStart(2, "0") + amountStr;
  let base = ONEPAY_STATIC_QR;
  if (base.includes("6304")) base = base.slice(0, base.indexOf("6304"));
  const qrRaw = base + EMVamount + "6304";

  function calculateCRC16(str: string): string {
    let crc = 0xFFFF;
    for (let i = 0; i < str.length; i++) {
      crc ^= str.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        if ((crc & 0x8000) !== 0) {
          crc = (crc << 1) ^ 0x1021;
        } else {
          crc = crc << 1;
        }
      }
    }
    return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, "0");
  }
  const crc = calculateCRC16(qrRaw);
  const qrFull = qrRaw + crc;

  return {
    qrCodeUrl: ONEPAY_BASE_URL + encodeURIComponent(qrFull),
    link: `onepay://qr/${qrFull}`,
    raw: qrFull
  };
}

export function POSTab({ employees, storeInfo, onNavigateToInventory }: POSTabProps) {
  const { products, getProductByBarcode, refetch: refetchProducts } = useProducts();
  const { createSale, getSaleItems } = useSales();
  const { customers, redeemPoints } = useCustomers();
  const { validateCoupon, calculateCouponDiscount, useCoupon, calculatePromotions } = usePromotions();
  const { isOnline, addOfflineSale, shouldUseOffline } = useOfflineSales();
  const { toast } = useToast();
  const { hasAlerts } = useStockAlerts(products);
  const { profile, user } = useAuth();
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
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
  
  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  
  // Variant dialog state (double-tap on product)
  const [variantProduct, setVariantProduct] = useState<Product | null>(null);
  const [showVariantDialog, setShowVariantDialog] = useState(false);
  const lastTapRef = useRef<{ productId: string; time: number } | null>(null);
  
  // Cart item variant selector state (tap on cart item)
  const [selectedCartItem, setSelectedCartItem] = useState<CartItem | null>(null);
  const [showCartItemSelector, setShowCartItemSelector] = useState(false);
  
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const barcodeBufferRef = useRef<string>('');
  const barcodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-fill employee based on logged-in user
  useEffect(() => {
    if (user && profile && employees.length > 0 && !selectedEmployee) {
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

  // Handle barcode detected
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

  // Listen for barcode scanner input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' && target !== barcodeInputRef.current) {
        return;
      }

      if (barcodeTimeoutRef.current) {
        clearTimeout(barcodeTimeoutRef.current);
      }

      if (e.key === 'Enter' && barcodeBufferRef.current.length > 0) {
        e.preventDefault();
        const barcode = barcodeBufferRef.current.trim();
        barcodeBufferRef.current = '';
        
        if (barcode.length >= 3) {
          handleBarcodeDetected(barcode);
        }
        return;
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        barcodeBufferRef.current += e.key;
        
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

  // Set cart item quantity directly
  const setCartItemQuantity = useCallback((productId: string, newQuantity: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.product_id === productId) {
          if (newQuantity <= 0) {
            return { ...item, quantity: 0 };
          }
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
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponDiscount(0);
  }, []);

  // Apply coupon
  const handleApplyCoupon = useCallback(async () => {
    if (!couponCode.trim()) return;
    
    setApplyingCoupon(true);
    const coupon = await validateCoupon(couponCode, cartTotal);
    if (coupon) {
      setAppliedCoupon(coupon);
      const discount = calculateCouponDiscount(coupon, cartTotal);
      setCouponDiscount(discount);
    }
    setApplyingCoupon(false);
  }, [couponCode, validateCoupon, calculateCouponDiscount]);

  // Remove coupon
  const handleRemoveCoupon = useCallback(() => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponDiscount(0);
  }, []);

  const cartTotal = cart.reduce((sum, item) => sum + item.total_price, 0);
  
  // Calculate promotion discounts
  const promotionResults = calculatePromotions(cart, products.map(p => ({ id: p.id, category_id: p.category_id })));
  const promotionDiscount = promotionResults.reduce((sum, r) => sum + r.discount, 0);
  
  // Total discounts
  const totalDiscount = discountAmount + couponDiscount + promotionDiscount;
  const finalTotal = Math.max(0, cartTotal - totalDiscount);
  
  // Points discount
  const pointsDiscount = usePoints && selectedCustomer 
    ? Math.min(selectedCustomer.loyalty_points * 100, finalTotal)
    : 0;
  const actualFinalTotal = finalTotal - pointsDiscount;
  const actualChange = receivedAmount - actualFinalTotal;

  // Recalculate coupon discount when cart changes
  useEffect(() => {
    if (appliedCoupon) {
      const discount = calculateCouponDiscount(appliedCoupon, cartTotal);
      setCouponDiscount(discount);
    }
  }, [cartTotal, appliedCoupon, calculateCouponDiscount]);

  const handleQuickCash = (amount: number) => {
    setReceivedAmount(prev => prev + amount);
  };

  const handleExactAmount = () => {
    setReceivedAmount(actualFinalTotal);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    
    setProcessing(true);
    try {
      const pointsToRedeem = pointsDiscount > 0 ? Math.ceil(pointsDiscount / 100) : 0;
      
      const sale = await createSale(
        cart,
        paymentMethod,
        totalDiscount,
        selectedEmployee || undefined,
        undefined,
        selectedCustomer?.id,
        pointsDiscount
      );

      if (sale) {
        // Use coupon if applied
        if (appliedCoupon) {
          await useCoupon(appliedCoupon.id);
        }

        if (pointsToRedeem > 0 && selectedCustomer) {
          await redeemPoints(selectedCustomer.id, pointsToRedeem);
        }
        
        const saleItems = await getSaleItems(sale.id);
        const selectedEmp = employees.find(e => e.id === selectedEmployee);
        
        setLastSale({ sale, items: saleItems || [] });
        
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
            setShowReceiptDialog(true);
          }
        }
        
        toast({
          title: 'ຂາຍສຳເລັດ!',
          description: `ເລກທີ່ໃບບິນ: ${sale.sale_number}`,
        });
        
        clearCart();
        setShowCheckout(false);
        refetchProducts();
      }
    } finally {
      setProcessing(false);
    }
  };

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

  const filteredProducts = products.filter(p => {
    if (!p.is_active) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return p.name.toLowerCase().includes(query) || 
             p.barcode?.toLowerCase().includes(query);
    }
    return true;
  });

  const filteredCustomers = customerSearch
    ? customers.filter(c => 
        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.phone?.includes(customerSearch)
      )
    : [];

  // Find original product ID for cart item (for variants)
  const getOriginalProductId = (cartItem: CartItem): string => {
    // Check if this is a variant (product_name contains " - ")
    const product = products.find(p => p.id === cartItem.product_id);
    if (product) return product.id;
    
    // For variants, try to find the original product
    const baseName = cartItem.product_name.split(' - ')[0];
    const originalProduct = products.find(p => p.name === baseName);
    return originalProduct?.id || cartItem.product_id;
  };

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col overflow-hidden">
      {/* Offline Indicator */}
      <OfflineIndicator />
      
      {/* Stock Alerts - Only show if there are alerts */}
      {hasAlerts && (
        <div className="mb-1 shrink-0">
          <StockAlerts products={products} onNavigateToInventory={onNavigateToInventory} />
        </div>
      )}

      {/* Main POS Grid - Full screen optimized */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-1 min-h-0 overflow-hidden">
        {/* Products Section - Takes 3/4 of space on desktop, full on mobile */}
        <div className="lg:col-span-3 flex flex-col min-h-0 gap-1 overflow-hidden">
          {/* Barcode Scanner Input - Ultra compact */}
          <Card className="shrink-0">
            <CardContent className="p-1">
              <form onSubmit={handleBarcodeSubmit} className="flex gap-1">
                <div className="relative flex-1">
                  <Barcode className="absolute left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                  <Input
                    ref={barcodeInputRef}
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    placeholder="ສະແກນບາໂຄ້ດ..."
                    className="pl-6 h-7 text-[10px]"
                  />
                </div>
                <Button type="submit" variant="secondary" size="sm" className="h-7 w-7 p-0">
                  <Search className="w-3 h-3" />
                </Button>
                <Button type="button" variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setShowCameraScanner(true)}>
                  <Camera className="w-3 h-3" />
                </Button>
              </form>
            </CardContent>
          </Card>

          <BarcodeScanner
            isOpen={showCameraScanner}
            onClose={() => setShowCameraScanner(false)}
            onScan={(barcode) => {
              handleBarcodeDetected(barcode);
              setShowCameraScanner(false);
            }}
          />

          {/* Search - Ultra compact */}
          <Card className="shrink-0">
            <CardContent className="p-1">
              <div className="relative">
                <Search className="absolute left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ຄົ້ນຫາສິນຄ້າ..."
                  className="pl-6 h-7 text-[10px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Products Grid - Maximized space */}
          <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <CardHeader className="py-1 px-1.5 shrink-0">
              <CardTitle className="text-[10px] flex items-center gap-1">
                <Package className="w-3 h-3" />
                ສິນຄ້າ ({filteredProducts.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-1 min-h-0 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-1">
                  {filteredProducts.map(product => (
                    <button
                      key={product.id}
                      onClick={() => {
                        const now = Date.now();
                        const lastTap = lastTapRef.current;
                        
                        if (lastTap && lastTap.productId === product.id && (now - lastTap.time) < 300) {
                          setVariantProduct(product);
                          setShowVariantDialog(true);
                          lastTapRef.current = null;
                        } else {
                          lastTapRef.current = { productId: product.id, time: now };
                          setTimeout(() => {
                            if (lastTapRef.current?.productId === product.id && lastTapRef.current?.time === now) {
                              addToCart(product);
                            }
                          }, 300);
                        }
                      }}
                      disabled={product.stock_quantity <= 0}
                      className={`p-1 rounded border text-left transition-all hover:shadow-sm ${
                        product.stock_quantity <= 0 
                          ? 'opacity-50 cursor-not-allowed bg-muted' 
                          : 'hover:border-primary cursor-pointer active:scale-95'
                      }`}
                    >
                      {product.image_url ? (
                        <img 
                          src={product.image_url} 
                          alt={product.name}
                          className="w-full aspect-square object-cover rounded mb-0.5"
                        />
                      ) : (
                        <div className="w-full aspect-square bg-muted rounded mb-0.5 flex items-center justify-center">
                          <Package className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                      <p className="font-medium text-[8px] leading-tight truncate" title={product.name}>
                        {product.name}
                      </p>
                      <p className="text-primary font-bold text-[8px] truncate">
                        ₭{product.selling_price.toLocaleString()}
                      </p>
                      <Badge 
                        variant={product.stock_quantity <= product.min_stock_level ? 'destructive' : 'secondary'}
                        className="text-[6px] px-0.5 py-0 h-2.5 w-fit"
                      >
                        {product.stock_quantity}
                      </Badge>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Cart Section - Fixed width on mobile, 1/4 on desktop */}
        <Card className="lg:col-span-1 flex flex-col min-h-0 overflow-hidden">
          <CardHeader className="py-1 px-1.5 shrink-0">
            <CardTitle className="flex items-center justify-between text-[10px]">
              <span className="flex items-center gap-1">
                <ShoppingCart className="w-3 h-3" />
                ຕະກ້າ ({cart.reduce((sum, i) => sum + i.quantity, 0)})
              </span>
              {cart.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearCart} className="h-5 px-1 text-[8px]">
                  <Trash2 className="w-2.5 h-2.5 mr-0.5" />
                  ລ້າງ
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-1 min-h-0 overflow-hidden">
            <ScrollArea className="flex-1 mb-1">
              {cart.length === 0 ? (
                <div className="text-center text-muted-foreground py-3">
                  <ShoppingCart className="w-6 h-6 mx-auto mb-1 opacity-50" />
                  <p className="text-[9px]">ຍັງບໍ່ມີສິນຄ້າ</p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {cart.map(item => (
                    <div 
                      key={item.product_id} 
                      className="flex items-center gap-0.5 p-1 rounded bg-secondary/50 cursor-pointer hover:bg-secondary/80 transition-colors"
                      onClick={() => {
                        setSelectedCartItem(item);
                        setShowCartItemSelector(true);
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[9px] truncate" title={item.product_name}>{item.product_name}</p>
                        <p className="text-[7px] text-muted-foreground">
                          ₭{item.unit_price.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-4 w-4"
                          onClick={() => updateCartItemQuantity(item.product_id, -1)}
                        >
                          <Minus className="w-2 h-2" />
                        </Button>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => setCartItemQuantity(item.product_id, parseInt(e.target.value) || 0)}
                          className="w-6 h-4 text-center text-[8px] p-0"
                          min={1}
                          max={item.stock_quantity}
                        />
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-4 w-4"
                          onClick={() => updateCartItemQuantity(item.product_id, 1)}
                        >
                          <Plus className="w-2 h-2" />
                        </Button>
                      </div>
                      <p className="font-medium text-[8px] w-10 text-right shrink-0">
                        ₭{item.total_price.toLocaleString()}
                      </p>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-4 w-4 text-destructive shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromCart(item.product_id);
                        }}
                      >
                        <Trash2 className="w-2 h-2" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Coupon Code Input - Compact */}
            <div className="border-t pt-1.5 mb-1 space-y-1">
              <div className="flex gap-1">
                <div className="relative flex-1">
                  <Tag className="absolute left-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-muted-foreground" />
                  <Input
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="ລະຫັດສ່ວນຫຼຸດ..."
                    className="pl-5 h-6 text-[10px]"
                    disabled={!!appliedCoupon}
                  />
                </div>
                {appliedCoupon ? (
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    className="h-6 px-1.5 text-[10px]"
                    onClick={handleRemoveCoupon}
                  >
                    ລຶບ
                  </Button>
                ) : (
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="h-6 px-1.5 text-[10px]"
                    onClick={handleApplyCoupon}
                    disabled={!couponCode.trim() || applyingCoupon}
                  >
                    ໃຊ້
                  </Button>
                )}
              </div>
              {appliedCoupon && (
                <div className="flex items-center justify-between text-[10px] text-primary bg-primary/10 rounded px-1.5 py-0.5">
                  <span className="flex items-center gap-0.5">
                    <Ticket className="w-2.5 h-2.5" />
                    {appliedCoupon.name}
                  </span>
                  <span>-₭{couponDiscount.toLocaleString()}</span>
                </div>
              )}
              {promotionResults.length > 0 && (
                <div className="space-y-0.5">
                  {promotionResults.map((result, index) => (
                    <div key={index} className="flex items-center justify-between text-[10px] text-accent-foreground bg-accent rounded px-1.5 py-0.5">
                      <span className="flex items-center gap-0.5 truncate">
                        <Tag className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">{result.description}</span>
                      </span>
                      <span className="shrink-0">-₭{result.discount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cart Summary - Compact */}
            <div className="border-t pt-1.5 space-y-1">
              <div className="flex justify-between text-[10px]">
                <span>ລວມ</span>
                <span>₭{cartTotal.toLocaleString()}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between text-[10px] text-primary">
                  <span>ສ່ວນຫຼຸດ</span>
                  <span>-₭{totalDiscount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-xs">
                <span>ຍອດຮວມ</span>
                <span className="text-primary">₭{finalTotal.toLocaleString()}</span>
              </div>
              <Button 
                className="w-full h-8 text-xs" 
                disabled={cart.length === 0}
                onClick={() => setShowCheckout(true)}
              >
                <CreditCard className="w-3.5 h-3.5 mr-1" />
                ຊຳລະເງິນ
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cart Item Variant Selector */}
      {selectedCartItem && (
        <CartItemVariantSelector
          isOpen={showCartItemSelector}
          onClose={() => {
            setShowCartItemSelector(false);
            setSelectedCartItem(null);
          }}
          cartItem={selectedCartItem}
          productId={getOriginalProductId(selectedCartItem)}
          onSelectVariant={(variant) => {
            // Replace cart item with variant
            setCart(prev => {
              const filtered = prev.filter(item => item.product_id !== selectedCartItem.product_id);
              const existing = filtered.find(item => item.product_id === variant.id);
              if (existing) {
                return filtered.map(item =>
                  item.product_id === variant.id
                    ? { ...item, quantity: item.quantity + selectedCartItem.quantity, total_price: (item.quantity + selectedCartItem.quantity) * item.unit_price }
                    : item
                );
              }
              return [...filtered, {
                product_id: variant.id,
                product_name: `${selectedCartItem.product_name.split(' - ')[0]} - ${Object.values(variant.attributes || {}).join('/')}`,
                barcode: variant.barcode,
                quantity: selectedCartItem.quantity,
                unit_price: variant.selling_price,
                total_price: selectedCartItem.quantity * variant.selling_price,
                stock_quantity: variant.stock_quantity,
              }];
            });
          }}
          onUpdateQuantity={(quantity) => {
            if (quantity <= 0) {
              removeFromCart(selectedCartItem.product_id);
            } else {
              setCartItemQuantity(selectedCartItem.product_id, quantity);
            }
          }}
        />
      )}

      {/* Product Variant Dialog (from double-tap) */}
      {variantProduct && (
        <ProductVariantDialog
          isOpen={showVariantDialog}
          onClose={() => {
            setShowVariantDialog(false);
            setVariantProduct(null);
          }}
          product={variantProduct}
          onSelectVariant={(variant) => {
            setCart(prev => {
              const existing = prev.find(item => item.product_id === variant.id);
              if (existing) {
                return prev.map(item =>
                  item.product_id === variant.id
                    ? { ...item, quantity: item.quantity + 1, total_price: (item.quantity + 1) * item.unit_price }
                    : item
                );
              }
              return [...prev, {
                product_id: variant.id,
                product_name: `${variantProduct.name} - ${Object.values(variant.attributes || {}).join('/')}`,
                barcode: variant.barcode,
                quantity: 1,
                unit_price: variant.selling_price,
                total_price: variant.selling_price,
                stock_quantity: variant.stock_quantity,
              }];
            });
            setShowVariantDialog(false);
            setVariantProduct(null);
          }}
        />
      )}

      {/* Checkout Dialog */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent className="max-w-sm max-h-[95vh] overflow-y-auto p-4">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base">ຊຳລະເງິນ</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3">
            {/* Customer Selection */}
            <div className="space-y-1">
              <Label className="flex items-center gap-1 text-xs">
                <User className="w-3 h-3" />
                ລູກຄ້າ
              </Label>
              <div className="relative">
                <Input
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    if (!e.target.value) setSelectedCustomer(null);
                  }}
                  placeholder="ຄົ້ນຫາດ້ວຍຊື່ ຫຼື ເບີໂທ..."
                  className="h-8 text-sm"
                />
                {customerSearch && filteredCustomers.length > 0 && !selectedCustomer && (
                  <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-32 overflow-y-auto">
                    {filteredCustomers.slice(0, 3).map(customer => (
                      <button
                        key={customer.id}
                        type="button"
                        className="w-full px-2 py-1.5 text-left hover:bg-muted flex justify-between items-center"
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setCustomerSearch(customer.name);
                        }}
                      >
                        <div>
                          <p className="font-medium text-xs">{customer.name}</p>
                          <p className="text-[10px] text-muted-foreground">{customer.phone}</p>
                        </div>
                        <div className="flex items-center gap-0.5 text-[10px] text-primary">
                          <Star className="w-2.5 h-2.5 fill-current" />
                          {customer.loyalty_points}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedCustomer && selectedCustomer.loyalty_points > 0 && (
                <div className="p-2 bg-secondary rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        id="use-points"
                        checked={usePoints}
                        onChange={(e) => setUsePoints(e.target.checked)}
                        className="rounded border-primary w-3 h-3"
                      />
                      <Label htmlFor="use-points" className="text-[10px] cursor-pointer">
                        ໃຊ້ຄະແນນ ({selectedCustomer.loyalty_points} pts)
                      </Label>
                    </div>
                    {usePoints && (
                      <span className="text-[10px] text-primary font-medium">
                        -₭{pointsDiscount.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="text-center p-3 bg-primary/10 rounded-lg">
              <p className="text-xs text-muted-foreground">ຍອດຮວມສຸດທິ</p>
              <p className="text-2xl font-bold text-primary">₭{actualFinalTotal.toLocaleString()}</p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">ພະນັກງານ</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger className="h-8 text-sm">
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
              <Label className="text-xs">ວິທີຊຳລະ</Label>
              <div className="grid grid-cols-3 gap-1.5">
                <Button
                  type="button"
                  variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod('cash')}
                  className="flex flex-col h-auto py-2"
                  size="sm"
                >
                  <Banknote className="w-4 h-4 mb-0.5" />
                  <span className="text-[10px]">ເງິນສົດ</span>
                </Button>
                <Button
                  type="button"
                  variant={paymentMethod === 'transfer' ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod('transfer')}
                  className="flex flex-col h-auto py-2"
                  size="sm"
                >
                  <CreditCard className="w-4 h-4 mb-0.5" />
                  <span className="text-[10px]">ໂອນ</span>
                </Button>
                <Button
                  type="button"
                  variant={paymentMethod === 'qr' ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod('qr')}
                  className="flex flex-col h-auto py-2"
                  size="sm"
                >
                  <QrCode className="w-4 h-4 mb-0.5" />
                  <span className="text-[10px]">QR Code</span>
                </Button>
              </div>
            </div>

            {/* QR Code Display */}
            {paymentMethod === 'qr' && (
              <div className="p-3 bg-secondary rounded-lg text-center">
                <p className="text-xs font-medium mb-2">ສະແກນ QR ເພື່ອຊຳລະເງິນ</p>
                <div className="bg-white p-2 rounded-lg inline-block">
                  <img
                    src={generateOnePayDynamicQR(actualFinalTotal).qrCodeUrl}
                    alt="OnePay Dynamic QR"
                    width={140}
                    height={140}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">AKAPHON XAYYABED</p>
                <p className="text-base font-bold text-primary mt-1">₭{actualFinalTotal.toLocaleString()}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">ສ່ວນຫຼຸດເພີ່ມ</Label>
                <Input
                  type="number"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(Number(e.target.value))}
                  min={0}
                  max={cartTotal}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">ເງິນທີ່ຮັບ</Label>
                <Input
                  type="number"
                  value={receivedAmount}
                  onChange={(e) => setReceivedAmount(Number(e.target.value))}
                  min={0}
                  className="h-8 text-sm"
                />
              </div>
            </div>

            {/* Quick Cash Buttons */}
            {paymentMethod === 'cash' && (
              <div className="space-y-1">
                <Label className="text-xs">ເງິນດ່ວນ</Label>
                <div className="flex flex-wrap gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleExactAmount}
                    className="text-primary border-primary h-7 px-2 text-xs"
                  >
                    <Check className="w-3 h-3 mr-0.5" />
                    ພໍດີ
                  </Button>
                  {QUICK_CASH_AMOUNTS.map(amount => (
                    <Button
                      key={amount}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickCash(amount)}
                      className="h-7 px-2 text-xs"
                    >
                      +{(amount / 1000)}k
                    </Button>
                  ))}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setReceivedAmount(0)}
                    className="text-muted-foreground h-7 px-2 text-xs"
                  >
                    ລ້າງ
                  </Button>
                </div>
              </div>
            )}

            {receivedAmount >= actualFinalTotal && paymentMethod === 'cash' && (
              <div className="p-2 bg-primary/10 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">ເງິນທອນ</p>
                <p className="text-lg font-bold text-primary">₭{actualChange.toLocaleString()}</p>
              </div>
            )}

            {/* Print Receipt Option */}
            <div className="flex items-center justify-between p-2 bg-secondary/50 rounded-lg">
              <Label htmlFor="print-receipt" className="flex items-center gap-1.5 cursor-pointer text-xs">
                <Printer className="w-3.5 h-3.5" />
                ພິມໃບບິນ
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
              {processing ? 'ກຳລັງບັນທຶກ...' : 'ຢືນຢັນ'}
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
            <div className="w-16 h-16 rounded-full bg-primary/10 mx-auto mb-4 flex items-center justify-center">
              <Printer className="w-8 h-8 text-primary" />
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
