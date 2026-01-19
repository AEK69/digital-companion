import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  ShoppingCart,
  Download,
  Printer,
  Search
} from 'lucide-react';
import { Product } from '@/hooks/useProducts';
import { format } from 'date-fns';

interface ReorderReportTabProps {
  products: Product[];
}

interface ReorderItem {
  product: Product;
  currentStock: number;
  minStock: number;
  suggestedOrder: number;
  estimatedCost: number;
  urgency: 'critical' | 'warning' | 'low';
}

export function ReorderReportTab({ products }: ReorderReportTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterUrgency, setFilterUrgency] = useState<'all' | 'critical' | 'warning' | 'low'>('all');

  // Calculate reorder items
  const reorderItems: ReorderItem[] = useMemo(() => {
    return products
      .filter(p => p.is_active && p.stock_quantity <= p.min_stock_level)
      .map(product => {
        const currentStock = product.stock_quantity;
        const minStock = product.min_stock_level;
        
        // Calculate suggested order: aim for 2x minimum stock level
        const targetStock = minStock * 2;
        const suggestedOrder = Math.max(targetStock - currentStock, minStock);
        const estimatedCost = suggestedOrder * product.cost_price;
        
        // Determine urgency
        let urgency: 'critical' | 'warning' | 'low';
        if (currentStock === 0) {
          urgency = 'critical';
        } else if (currentStock <= minStock * 0.5) {
          urgency = 'warning';
        } else {
          urgency = 'low';
        }
        
        return {
          product,
          currentStock,
          minStock,
          suggestedOrder,
          estimatedCost,
          urgency,
        };
      })
      .sort((a, b) => {
        // Sort by urgency first, then by stock percentage
        const urgencyOrder = { critical: 0, warning: 1, low: 2 };
        if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
          return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
        }
        return (a.currentStock / a.minStock) - (b.currentStock / b.minStock);
      });
  }, [products]);

  // Filter items
  const filteredItems = useMemo(() => {
    return reorderItems.filter(item => {
      if (filterUrgency !== 'all' && item.urgency !== filterUrgency) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return item.product.name.toLowerCase().includes(query) ||
               item.product.barcode?.toLowerCase().includes(query);
      }
      return true;
    });
  }, [reorderItems, filterUrgency, searchQuery]);

  // Summary stats
  const stats = useMemo(() => ({
    total: reorderItems.length,
    critical: reorderItems.filter(i => i.urgency === 'critical').length,
    warning: reorderItems.filter(i => i.urgency === 'warning').length,
    low: reorderItems.filter(i => i.urgency === 'low').length,
    totalCost: reorderItems.reduce((sum, i) => sum + i.estimatedCost, 0),
  }), [reorderItems]);

  // Print report
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>ລາຍງານສັ່ງຊື້ສິນຄ້າ</title>
        <style>
          body { font-family: 'Noto Sans Lao', Arial, sans-serif; padding: 20px; }
          h1 { text-align: center; margin-bottom: 10px; }
          .date { text-align: center; margin-bottom: 20px; color: #666; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .critical { background-color: #fee2e2; }
          .warning { background-color: #fef3c7; }
          .summary { margin-top: 20px; padding: 15px; background: #f5f5f5; border-radius: 8px; }
          .text-right { text-align: right; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>ລາຍງານສັ່ງຊື້ສິນຄ້າ</h1>
        <div class="date">ວັນທີ: ${format(new Date(), 'dd/MM/yyyy HH:mm')}</div>
        
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>ສິນຄ້າ</th>
              <th>ບາໂຄ້ດ</th>
              <th class="text-right">ສະຕ໊ອກປັດຈຸບັນ</th>
              <th class="text-right">ຂັ້ນຕ່ຳ</th>
              <th class="text-right">ແນະນຳສັ່ງ</th>
              <th class="text-right">ມູນຄ່າ</th>
            </tr>
          </thead>
          <tbody>
            ${filteredItems.map((item, idx) => `
              <tr class="${item.urgency}">
                <td>${idx + 1}</td>
                <td>${item.product.name}</td>
                <td>${item.product.barcode || '-'}</td>
                <td class="text-right">${item.currentStock} ${item.product.unit}</td>
                <td class="text-right">${item.minStock} ${item.product.unit}</td>
                <td class="text-right">${item.suggestedOrder} ${item.product.unit}</td>
                <td class="text-right">₭${item.estimatedCost.toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="summary">
          <p><strong>ສະຫຼຸບ:</strong></p>
          <p>ສິນຄ້າທີ່ຕ້ອງສັ່ງ: ${filteredItems.length} ລາຍການ</p>
          <p>ມູນຄ່າລວມ: ₭${filteredItems.reduce((sum, i) => sum + i.estimatedCost, 0).toLocaleString()}</p>
        </div>
        
        <script>window.print();</script>
      </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // Export to CSV
  const handleExport = () => {
    const headers = ['ລຳດັບ', 'ສິນຄ້າ', 'ບາໂຄ້ດ', 'ສະຕ໊ອກປັດຈຸບັນ', 'ຂັ້ນຕ່ຳ', 'ແນະນຳສັ່ງ', 'ມູນຄ່າ', 'ຄວາມຮີບດ່ວນ'];
    const rows = filteredItems.map((item, idx) => [
      idx + 1,
      item.product.name,
      item.product.barcode || '',
      `${item.currentStock} ${item.product.unit}`,
      `${item.minStock} ${item.product.unit}`,
      `${item.suggestedOrder} ${item.product.unit}`,
      item.estimatedCost,
      item.urgency === 'critical' ? 'ວິກິດ' : item.urgency === 'warning' ? 'ເຕືອນ' : 'ຕ່ຳ',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reorder-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const getUrgencyBadge = (urgency: 'critical' | 'warning' | 'low') => {
    switch (urgency) {
      case 'critical':
        return <Badge variant="destructive">ວິກິດ</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">ເຕືອນ</Badge>;
      case 'low':
        return <Badge variant="outline">ຕ່ຳ</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">ທັງໝົດ</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-destructive">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-destructive" />
              <div>
                <p className="text-sm text-muted-foreground">ວິກິດ</p>
                <p className="text-2xl font-bold text-destructive">{stats.critical}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">ເຕືອນ</p>
                <p className="text-2xl font-bold text-yellow-500">{stats.warning}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">ຕ່ຳ</p>
                <p className="text-2xl font-bold">{stats.low}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-primary/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <ShoppingCart className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">ມູນຄ່າລວມ</p>
                <p className="text-xl font-bold">₭{stats.totalCost.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ຄົ້ນຫາສິນຄ້າ..."
                  className="pl-10"
                />
              </div>
              <div className="flex gap-1">
                <Button
                  variant={filterUrgency === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterUrgency('all')}
                >
                  ທັງໝົດ
                </Button>
                <Button
                  variant={filterUrgency === 'critical' ? 'destructive' : 'outline'}
                  size="sm"
                  onClick={() => setFilterUrgency('critical')}
                >
                  ວິກິດ
                </Button>
                <Button
                  variant={filterUrgency === 'warning' ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setFilterUrgency('warning')}
                  className={filterUrgency === 'warning' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' : ''}
                >
                  ເຕືອນ
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                ດາວໂຫລດ CSV
              </Button>
              <Button onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-2" />
                ພິມລາຍງານ
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reorder Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            ລາຍການສິນຄ້າທີ່ຕ້ອງສັ່ງຊື້ ({filteredItems.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">ບໍ່ມີສິນຄ້າທີ່ຕ້ອງສັ່ງຊື້</p>
              <p className="text-sm">ສິນຄ້າທັງໝົດມີສະຕ໊ອກພຽງພໍ</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ສິນຄ້າ</TableHead>
                    <TableHead className="text-center">ຄວາມຮີບດ່ວນ</TableHead>
                    <TableHead className="text-right">ສະຕ໊ອກປັດຈຸບັນ</TableHead>
                    <TableHead className="text-right">ຂັ້ນຕ່ຳ</TableHead>
                    <TableHead className="text-right">ແນະນຳສັ່ງ</TableHead>
                    <TableHead className="text-right">ລາຄາຕົ້ນທຶນ</TableHead>
                    <TableHead className="text-right">ມູນຄ່າລວມ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow 
                      key={item.product.id}
                      className={
                        item.urgency === 'critical' ? 'bg-destructive/10' :
                        item.urgency === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''
                      }
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.product.barcode || 'ບໍ່ມີບາໂຄ້ດ'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {getUrgencyBadge(item.urgency)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={item.currentStock === 0 ? 'destructive' : 'secondary'}>
                          {item.currentStock} {item.product.unit}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {item.minStock} {item.product.unit}
                      </TableCell>
                      <TableCell className="text-right font-medium text-primary">
                        {item.suggestedOrder} {item.product.unit}
                      </TableCell>
                      <TableCell className="text-right">
                        ₭{item.product.cost_price.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        ₭{item.estimatedCost.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
