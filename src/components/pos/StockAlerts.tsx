import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  AlertTriangle, 
  Package,
  Bell,
  X
} from 'lucide-react';
import { Product } from '@/hooks/useProducts';
import { useToast } from '@/hooks/use-toast';

interface StockAlertsProps {
  products: Product[];
  onNavigateToInventory?: () => void;
}

export function StockAlerts({ products, onNavigateToInventory }: StockAlertsProps) {
  const { toast } = useToast();
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  // Get products with low stock
  const lowStockProducts = products.filter(p => 
    p.is_active && 
    p.stock_quantity <= p.min_stock_level &&
    !dismissedAlerts.has(p.id)
  );

  const outOfStockProducts = lowStockProducts.filter(p => p.stock_quantity === 0);
  const warningProducts = lowStockProducts.filter(p => p.stock_quantity > 0);

  // Show notification when new low stock is detected
  useEffect(() => {
    if (lowStockProducts.length > 0) {
      const criticalCount = outOfStockProducts.length;
      if (criticalCount > 0) {
        toast({
          title: '⚠️ ສິນຄ້າໝົດສະຕ໊ອກ',
          description: `${criticalCount} ລາຍການສິນຄ້າໝົດສະຕ໊ອກ`,
          variant: 'destructive',
        });
      }
    }
  }, [outOfStockProducts.length]);

  const dismissAlert = (productId: string) => {
    setDismissedAlerts(prev => new Set(prev).add(productId));
  };

  if (lowStockProducts.length === 0) {
    return null;
  }

  return (
    <Card className="border-yellow-500 bg-yellow-50/50 dark:bg-yellow-900/10">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-500">
          <AlertTriangle className="w-5 h-5" />
          ແຈ້ງເຕືອນສິນຄ້າໃກ້ໝົດ ({lowStockProducts.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[200px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ສິນຄ້າ</TableHead>
                <TableHead className="text-right">ຄົງເຫຼືອ</TableHead>
                <TableHead className="text-right">ຂັ້ນຕ່ຳ</TableHead>
                <TableHead>ສະຖານະ</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lowStockProducts.map(product => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium flex items-center gap-2">
                    <Package className="w-4 h-4 text-muted-foreground" />
                    {product.name}
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {product.stock_quantity}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {product.min_stock_level}
                  </TableCell>
                  <TableCell>
                    {product.stock_quantity === 0 ? (
                      <Badge variant="destructive">
                        ໝົດສະຕ໊ອກ
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                        ໃກ້ໝົດ
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => dismissAlert(product.id)}
                      className="h-6 w-6"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>

        {onNavigateToInventory && (
          <div className="mt-4">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={onNavigateToInventory}
            >
              <Bell className="w-4 h-4 mr-2" />
              ໄປຈັດການສະຕ໊ອກ
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Hook to check stock alerts
export function useStockAlerts(products: Product[]) {
  const lowStockProducts = products.filter(p => 
    p.is_active && 
    p.stock_quantity <= p.min_stock_level
  );

  const outOfStockCount = lowStockProducts.filter(p => p.stock_quantity === 0).length;
  const lowStockCount = lowStockProducts.filter(p => p.stock_quantity > 0).length;

  return {
    lowStockProducts,
    outOfStockCount,
    lowStockCount,
    hasAlerts: lowStockProducts.length > 0,
    totalAlerts: lowStockProducts.length,
  };
}
