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
  Tag,
  FileText,
  Phone,
  MapPin,
  Calendar
} from 'lucide-react';
import { Product, useProducts } from '@/hooks/useProducts';
import { CartItem, useSales } from '@/hooks/useSales';
import { useCustomers, Customer } from '@/hooks/useCustomers';
import { usePromotions, Coupon } from '@/hooks/usePromotions';
import { useOfflineSales } from '@/hooks/useOfflineSales';
import { useProductVariants, ProductVariant } from '@/hooks/useProductVariants';
import { useCreditSales } from '@/hooks/useCreditSales';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Employee, StoreInfo } from '@/types';
import { BarcodeScanner } from './BarcodeScanner';
import { StockAlerts, useStockAlerts } from './StockAlerts';
import { OfflineIndicator } from './OfflineIndicator';
import { ProductVariantDialog } from './ProductVariantDialog';
import { CartItemVariantSelector } from './CartItemVariantSelector';
import { ProductDetailPopup } from './ProductDetailPopup';
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
  const { products, categories, getProductByBarcode, refetch: refetchProducts } = useProducts();
  const { createSale, getSaleItems } = useSales();
  const { customers, redeemPoints } = useCustomers();
  const { validateCoupon, calculateCouponDiscount, useCoupon, calculatePromotions } = usePromotions();
  const { isOnline, addOfflineSale, shouldUseOffline } = useOfflineSales();
  const { createCreditSale, creditSales } = useCreditSales();
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
  
  // Credit/Debt payment state
  const [showCreditDialog, setShowCreditDialog] = useState(false);
  const [creditCustomerName, setCreditCustomerName] = useState('');
  const [creditCustomerPhone, setCreditCustomerPhone] = useState('');
  const [creditCustomerAddress, setCreditCustomerAddress] = useState('');
  const [creditDueDate, setCreditDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [creditNote, setCreditNote] = useState('');
  const [creditSuggestions, setCreditSuggestions] = useState<Array<{name: string; phone: string | null; address: string | null}>>([]);
  
  // Variant dialog state (double-tap on product)
  const [variantProduct, setVariantProduct] = useState<Product | null>(null);
  const [showVariantDialog, setShowVariantDialog] = useState(false);
  const lastTapRef = useRef<{ productId: string; time: number } | null>(null);
  
  // Cart item variant selector state (tap on cart item)
  const [selectedCartItem, setSelectedCartItem] = useState<CartItem | null>(null);
  const [showCartItemSelector, setShowCartItemSelector] = useState(false);
  
  // Product detail popup state (long press)
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [showDetailPopup, setShowDetailPopup] = useState(false);
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
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
    
    // Validate credit payment
    if (paymentMethod === 'credit' && !creditCustomerName.trim()) {
      toast({
        title: 'ກະລຸນາປ້ອນຊື່ລູກຄ້າ',
        description: 'ຕ້ອງລະບຸຊື່ຜູ້ຕິດໜີ້',
        variant: 'destructive',
      });
      return;
    }
    
    setProcessing(true);
    try {
      const pointsToRedeem = pointsDiscount > 0 ? Math.ceil(pointsDiscount / 100) : 0;
      
      const sale = await createSale(
        cart,
        paymentMethod,
        totalDiscount,
        selectedEmployee || undefined,
        paymentMethod === 'credit' ? `ຕິດໜີ້ - ${creditCustomerName}` : undefined,
        selectedCustomer?.id,
        pointsDiscount
      );

      if (sale) {
        // Handle credit sale - create credit record
        if (paymentMethod === 'credit') {
          await createCreditSale({
            sale_id: sale.id,
            customer_name: creditCustomerName,
            customer_phone: creditCustomerPhone || undefined,
            customer_address: creditCustomerAddress || undefined,
            total_amount: actualFinalTotal,
            due_date: creditDueDate || undefined,
            note: creditNote || undefined,
          });
          
          // Reset credit form
          setCreditCustomerName('');
          setCreditCustomerPhone('');
          setCreditCustomerAddress('');
          setCreditDueDate(new Date().toISOString().split('T')[0]);
          setCreditNote('');
          setCreditSuggestions([]);
        }
        
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
          title: paymentMethod === 'credit' ? 'ບັນທຶກການຕິດໜີ້ສຳເລັດ!' : 'ຂາຍສຳເລັດ!',
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
    <div className="h-[calc(100vh-80px)] flex flex-col overflow-hidden p-2">
      {/* Offline Indicator */}
      <OfflineIndicator />
      
      {/* Stock Alerts - Only show if there are alerts */}
      {hasAlerts && (
        <div className="mb-2 shrink-0">
          <StockAlerts products={products} onNavigateToInventory={onNavigateToInventory} />
        </div>
      )}

      {/* Main POS Grid - Full screen optimized */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0 overflow-hidden">
        {/* Products Section - Takes 7/12 of space on desktop, full on mobile */}
        <div className="lg:col-span-7 flex flex-col min-h-0 gap-2 overflow-hidden">
          {/* Barcode Scanner & Search Combined */}
          <Card className="shrink-0">
            <CardContent className="p-3">
              <div className="flex gap-2">
                <form onSubmit={handleBarcodeSubmit} className="flex gap-2 flex-1">
                  <div className="relative flex-1">
                    <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      ref={barcodeInputRef}
                      value={barcodeInput}
                      onChange={(e) => setBarcodeInput(e.target.value)}
                      placeholder="ສະແກນບາໂຄ້ດ..."
                      className="pl-10 h-12 text-base"
                    />
                  </div>
                  <Button type="submit" variant="secondary" size="lg" className="h-12 w-12 p-0">
                    <Search className="w-5 h-5" />
                  </Button>
                  <Button type="button" variant="outline" size="lg" className="h-12 w-12 p-0" onClick={() => setShowCameraScanner(true)}>
                    <Camera className="w-5 h-5" />
                  </Button>
                </form>
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ຄົ້ນຫາສິນຄ້າ..."
                    className="pl-10 h-12 text-base"
                  />
                </div>
              </div>
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

          {/* Products Grid - Maximized space with scrollable container */}
          <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <CardHeader className="py-3 px-4 shrink-0 border-b">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="w-5 h-5" />
                ສິນຄ້າ ({filteredProducts.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-3 min-h-0 overflow-hidden">
              <ScrollArea className="h-full pr-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 pb-4">
                  {filteredProducts.map(product => (
                    <button
                      key={product.id}
                      onClick={() => {
                        // Clear long press timeout
                        if (longPressTimeoutRef.current) {
                          clearTimeout(longPressTimeoutRef.current);
                          longPressTimeoutRef.current = null;
                        }
                        addToCart(product);
                      }}
                      onMouseDown={() => {
                        longPressTimeoutRef.current = setTimeout(() => {
                          setDetailProduct(product);
                          setShowDetailPopup(true);
                          lastTapRef.current = null;
                        }, 500);
                      }}
                      onMouseUp={() => {
                        if (longPressTimeoutRef.current) {
                          clearTimeout(longPressTimeoutRef.current);
                          longPressTimeoutRef.current = null;
                        }
                      }}
                      onMouseLeave={() => {
                        if (longPressTimeoutRef.current) {
                          clearTimeout(longPressTimeoutRef.current);
                          longPressTimeoutRef.current = null;
                        }
                      }}
                      onTouchStart={() => {
                        longPressTimeoutRef.current = setTimeout(() => {
                          setDetailProduct(product);
                          setShowDetailPopup(true);
                          lastTapRef.current = null;
                        }, 500);
                      }}
                      onTouchEnd={() => {
                        if (longPressTimeoutRef.current) {
                          clearTimeout(longPressTimeoutRef.current);
                          longPressTimeoutRef.current = null;
                        }
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setDetailProduct(product);
                        setShowDetailPopup(true);
                      }}
                      disabled={product.stock_quantity <= 0}
                      className={`p-3 rounded-lg border-2 text-left transition-all hover:shadow-md ${
                        product.stock_quantity <= 0 
                          ? 'opacity-50 cursor-not-allowed bg-muted' 
                          : 'hover:border-primary cursor-pointer active:scale-95'
                      }`}
                    >
                      {product.image_url ? (
                        <img 
                          src={product.image_url} 
                          alt={product.name}
                          className="w-full aspect-square object-cover rounded-lg mb-2"
                        />
                      ) : (
                        <div className="w-full aspect-square bg-muted rounded-lg mb-2 flex items-center justify-center">
                          <Package className="w-10 h-10 text-muted-foreground" />
                        </div>
                      )}
                      <p className="font-semibold text-sm leading-tight truncate" title={product.name}>
                        {product.name}
                      </p>
                      <p className="text-primary font-bold text-lg mt-1">
                        ₭{product.selling_price.toLocaleString()}
                      </p>
                      <Badge 
                        variant={product.stock_quantity <= product.min_stock_level ? 'destructive' : 'secondary'}
                        className="text-xs px-2 py-0.5 mt-1"
                      >
                        ສະຕ໊ອກ: {product.stock_quantity}
                      </Badge>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Cart Section - 5/12 on desktop for wider visibility */}
        <Card className="lg:col-span-5 flex flex-col min-h-0 overflow-hidden">
          <CardHeader className="py-3 px-4 shrink-0 border-b">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                ຕະກ້າ ({cart.reduce((sum, i) => sum + i.quantity, 0)} ລາຍການ)
              </span>
              {cart.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearCart} className="h-8 px-3 text-sm">
                  <Trash2 className="w-4 h-4 mr-1" />
                  ລ້າງ
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-3 min-h-0 overflow-hidden">
            {/* Scrollable cart items container with reserved space at bottom */}
            <ScrollArea className="flex-1 mb-3">
              <div className="pr-2 pb-4">
                {cart.length === 0 ? (
                  <div className="text-center text-muted-foreground py-12">
                    <ShoppingCart className="w-16 h-16 mx-auto mb-3 opacity-50" />
                    <p className="text-lg">ຍັງບໍ່ມີສິນຄ້າໃນຕະກ້າ</p>
                    <p className="text-sm mt-1">ກົດສິນຄ້າເພື່ອເພີ່ມລົງຕະກ້າ</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {cart.map(item => (
                      <div 
                        key={item.product_id} 
                        className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50 cursor-pointer hover:bg-secondary/80 transition-colors border h-14"
                        onClick={() => {
                          setSelectedCartItem(item);
                          setShowCartItemSelector(true);
                        }}
                      >
                      <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm leading-tight line-clamp-1" title={item.product_name}>{item.product_name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            ₭{item.unit_price.toLocaleString()} × {item.quantity}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => updateCartItemQuantity(item.product_id, -1)}
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => setCartItemQuantity(item.product_id, parseInt(e.target.value) || 0)}
                            className="w-12 h-8 text-center text-sm font-bold"
                            min={1}
                            max={item.stock_quantity}
                          />
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => updateCartItemQuantity(item.product_id, 1)}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                        <p className="font-bold text-sm w-24 text-right shrink-0 text-primary">
                          ₭{item.total_price.toLocaleString()}
                        </p>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFromCart(item.product_id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Fixed bottom section - Coupon, Summary, and Checkout */}
            <div className="shrink-0 border-t pt-3 space-y-3">
              {/* Coupon Code Input */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="ລະຫັດສ່ວນຫຼຸດ..."
                    className="pl-9 h-10 text-sm"
                    disabled={!!appliedCoupon}
                  />
                </div>
                {appliedCoupon ? (
                  <Button 
                    variant="destructive" 
                    size="default" 
                    className="h-10 px-4"
                    onClick={handleRemoveCoupon}
                  >
                    ລຶບ
                  </Button>
                ) : (
                  <Button 
                    variant="secondary" 
                    size="default" 
                    className="h-10 px-4"
                    onClick={handleApplyCoupon}
                    disabled={!couponCode.trim() || applyingCoupon}
                  >
                    ໃຊ້ສ່ວນຫຼຸດ
                  </Button>
                )}
              </div>
              {appliedCoupon && (
                <div className="flex items-center justify-between text-sm text-primary bg-primary/10 rounded-lg px-3 py-2">
                  <span className="flex items-center gap-2">
                    <Ticket className="w-4 h-4" />
                    {appliedCoupon.name}
                  </span>
                  <span className="font-bold">-₭{couponDiscount.toLocaleString()}</span>
                </div>
              )}
              {promotionResults.length > 0 && (
                <div className="space-y-1">
                  {promotionResults.map((result, index) => (
                    <div key={index} className="flex items-center justify-between text-sm text-accent-foreground bg-accent rounded-lg px-3 py-2">
                      <span className="flex items-center gap-2 truncate">
                        <Tag className="w-4 h-4 shrink-0" />
                        <span className="truncate">{result.description}</span>
                      </span>
                      <span className="shrink-0 font-bold">-₭{result.discount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Cart Summary */}
              <div className="space-y-2 bg-muted/50 rounded-lg p-3">
                <div className="flex justify-between text-sm">
                  <span>ລວມທັງໝົດ</span>
                  <span className="font-medium">₭{cartTotal.toLocaleString()}</span>
                </div>
                {totalDiscount > 0 && (
                  <div className="flex justify-between text-sm text-primary">
                    <span>ສ່ວນຫຼຸດ</span>
                    <span className="font-medium">-₭{totalDiscount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-xl pt-2 border-t">
                  <span>ຍອດຮວມສຸດທິ</span>
                  <span className="text-primary">₭{finalTotal.toLocaleString()}</span>
                </div>
              </div>

              {/* Checkout Button */}
              <Button 
                className="w-full h-14 text-lg font-bold" 
                disabled={cart.length === 0}
                onClick={() => setShowCheckout(true)}
              >
                <CreditCard className="w-6 h-6 mr-2" />
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

      {/* Product Detail Popup (from long press) */}
      <ProductDetailPopup
        isOpen={showDetailPopup}
        onClose={() => {
          setShowDetailPopup(false);
          setDetailProduct(null);
        }}
        product={detailProduct}
        onAddToCart={addToCart}
        categories={categories}
      />

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
              <div className="grid grid-cols-4 gap-1.5">
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
                <Button
                  type="button"
                  variant={paymentMethod === 'credit' ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod('credit')}
                  className="flex flex-col h-auto py-2 border-dashed"
                  size="sm"
                >
                  <FileText className="w-4 h-4 mb-0.5" />
                  <span className="text-[10px]">ຕິດໜີ້</span>
                </Button>
              </div>
            </div>

            {/* Credit Payment - Show credit form */}
            {paymentMethod === 'credit' && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg space-y-3">
                <p className="text-xs font-medium text-destructive flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  ຂໍ້ມູນຜູ້ຕິດໜີ້
                </p>
                <div className="space-y-2">
                  <div className="space-y-1">
                    <Label className="text-xs">ຊື່ລູກຄ້າ *</Label>
                    <div className="relative">
                      <User className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                      <Input
                        value={creditCustomerName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCreditCustomerName(val);
                          if (val.length >= 1) {
                            const uniqueCustomers = creditSales
                              .filter(cs => cs.customer_name.toLowerCase().includes(val.toLowerCase()))
                              .reduce((acc, cs) => {
                                if (!acc.find(c => c.name === cs.customer_name)) {
                                  acc.push({ name: cs.customer_name, phone: cs.customer_phone, address: cs.customer_address });
                                }
                                return acc;
                              }, [] as Array<{name: string; phone: string | null; address: string | null}>);
                            setCreditSuggestions(uniqueCustomers.slice(0, 5));
                          } else {
                            setCreditSuggestions([]);
                          }
                        }}
                        placeholder="ຊື່ຜູ້ຊື້..."
                        className="h-8 text-sm pl-7"
                        required
                      />
                      {creditSuggestions.length > 0 && creditCustomerName && (
                        <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-32 overflow-y-auto">
                          {creditSuggestions.map((cs, i) => (
                            <button
                              key={i}
                              type="button"
                              className="w-full px-2 py-1.5 text-left hover:bg-muted text-xs"
                              onClick={() => {
                                setCreditCustomerName(cs.name);
                                if (cs.phone) setCreditCustomerPhone(cs.phone);
                                if (cs.address) setCreditCustomerAddress(cs.address);
                                setCreditSuggestions([]);
                              }}
                            >
                              <p className="font-medium">{cs.name}</p>
                              {cs.phone && <p className="text-muted-foreground">{cs.phone}</p>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">ເບີໂທ</Label>
                      <div className="relative">
                        <Phone className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                        <Input
                          value={creditCustomerPhone}
                          onChange={(e) => setCreditCustomerPhone(e.target.value)}
                          placeholder="020..."
                          className="h-8 text-sm pl-7"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">ກຳນົດຊຳລະ</Label>
                      <div className="relative">
                        <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                        <Input
                          type="date"
                          value={creditDueDate}
                          onChange={(e) => setCreditDueDate(e.target.value)}
                          className="h-8 text-sm pl-7"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">ທີ່ຢູ່</Label>
                    <div className="relative">
                      <MapPin className="absolute left-2 top-2 w-3 h-3 text-muted-foreground" />
                      <Input
                        value={creditCustomerAddress}
                        onChange={(e) => setCreditCustomerAddress(e.target.value)}
                        placeholder="ບ້ານ, ເມືອງ..."
                        className="h-8 text-sm pl-7"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">ໝາຍເຫດ</Label>
                    <Textarea
                      value={creditNote}
                      onChange={(e) => setCreditNote(e.target.value)}
                      placeholder="ໝາຍເຫດເພີ່ມເຕີມ..."
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

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
              disabled={processing || (paymentMethod === 'cash' && receivedAmount < actualFinalTotal) || (paymentMethod === 'credit' && !creditCustomerName.trim())}
              variant={paymentMethod === 'credit' ? 'destructive' : 'default'}
            >
              {processing ? 'ກຳລັງບັນທຶກ...' : paymentMethod === 'credit' ? 'ບັນທຶກຕິດໜີ້' : 'ຢືນຢັນ'}
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
