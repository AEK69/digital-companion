import { useEffect, useState } from 'react';
import { CartItem } from '@/hooks/useSales';
import { StoreInfo } from '@/types';
import { ShoppingCart, Package } from 'lucide-react';

interface CustomerDisplayProps {
  cart: CartItem[];
  total: number;
  discount: number;
  storeInfo: StoreInfo;
}

export function CustomerDisplay({ cart, total, discount, storeInfo }: CustomerDisplayProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const finalTotal = total - discount;

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-primary/10 via-background to-primary/5 flex flex-col">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {storeInfo.logo ? (
              <img src={storeInfo.logo} alt={storeInfo.name} className="h-16 w-16 rounded-lg object-cover" />
            ) : (
              <div className="h-16 w-16 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
                <ShoppingCart className="h-8 w-8" />
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold">{storeInfo.name}</h1>
              {storeInfo.phone && <p className="text-primary-foreground/80">{storeInfo.phone}</p>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-4xl font-mono font-bold">
              {currentTime.toLocaleTimeString('lo-LA', { hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className="text-primary-foreground/80">
              {currentTime.toLocaleDateString('lo-LA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Cart Items */}
        <div className="flex-1 p-6 overflow-hidden">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <Package className="h-32 w-32 mb-6 opacity-30" />
              <p className="text-3xl font-medium">ຍິນດີຕ້ອນຮັບ</p>
              <p className="text-xl mt-2">ກະລຸນາເລືອກສິນຄ້າ</p>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <ShoppingCart className="h-6 w-6" />
                ລາຍການສິນຄ້າ
              </h2>
              <div className="flex-1 overflow-y-auto space-y-3">
                {cart.map((item, index) => (
                  <div 
                    key={item.product_id}
                    className="bg-card rounded-xl p-4 shadow-sm border flex items-center justify-between animate-in slide-in-from-left-5"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Package className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-lg font-medium">{item.product_name}</p>
                        <p className="text-muted-foreground">
                          ₭{item.unit_price.toLocaleString()} × {item.quantity}
                        </p>
                      </div>
                    </div>
                    <p className="text-xl font-bold text-primary">
                      ₭{item.total_price.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Total Display */}
        <div className="w-96 bg-card border-l p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-muted-foreground text-lg">ລວມທັງໝົດ</p>
              <p className="text-5xl font-bold text-primary mt-2">
                ₭{total.toLocaleString()}
              </p>
            </div>

            {discount > 0 && (
              <>
                <div className="border-t pt-4">
                  <div className="flex justify-between text-lg">
                    <span className="text-muted-foreground">ສ່ວນຫຼຸດ</span>
                    <span className="text-green-600 font-medium">-₭{discount.toLocaleString()}</span>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <div className="text-center">
                    <p className="text-muted-foreground">ຍອດສຸດທິ</p>
                    <p className="text-6xl font-bold text-primary mt-2">
                      ₭{finalTotal.toLocaleString()}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="space-y-2 text-center text-sm text-muted-foreground">
            <p>ຂອບໃຈທີ່ໃຊ້ບໍລິການ</p>
            {storeInfo.address && <p>{storeInfo.address}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

// Component to open customer display in new window
export function openCustomerDisplay(storeInfo: StoreInfo) {
  const displayWindow = window.open('', 'CustomerDisplay', 'width=1280,height=720,menubar=no,toolbar=no');
  
  if (displayWindow) {
    displayWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Customer Display - ${storeInfo.name}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Noto Sans Lao', sans-serif; 
              background: linear-gradient(135deg, hsl(var(--primary) / 0.1), hsl(var(--background)), hsl(var(--primary) / 0.05));
              min-height: 100vh;
            }
          </style>
        </head>
        <body>
          <div id="customer-display"></div>
        </body>
      </html>
    `);
  }
  
  return displayWindow;
}
