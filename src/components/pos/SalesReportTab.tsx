import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  TrendingUp, 
  Calendar,
  DollarSign,
  ShoppingCart,
  FileText,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useSales, Sale, SaleItem } from '@/hooks/useSales';
import { useProducts } from '@/hooks/useProducts';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function SalesReportTab() {
  const { sales, getMonthlySales, getSaleItems } = useSales();
  const { products } = useProducts();
  
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [monthlySales, setMonthlySales] = useState<Sale[]>([]);
  const [selectedSaleItems, setSelectedSaleItems] = useState<SaleItem[]>([]);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadMonthlySales = async () => {
      setLoading(true);
      const data = await getMonthlySales(selectedYear, selectedMonth);
      setMonthlySales(data);
      setLoading(false);
    };
    loadMonthlySales();
  }, [selectedYear, selectedMonth, getMonthlySales]);

  const handleViewSaleItems = async (saleId: string) => {
    const items = await getSaleItems(saleId);
    setSelectedSaleItems(items);
    setSelectedSaleId(saleId);
  };

  // Calculate monthly statistics
  const totalSales = monthlySales.length;
  const totalRevenue = monthlySales.reduce((sum, s) => sum + s.final_amount, 0);
  const totalDiscount = monthlySales.reduce((sum, s) => sum + s.discount_amount, 0);
  const avgSale = totalSales > 0 ? totalRevenue / totalSales : 0;

  // Group sales by day for chart
  const dailySales = monthlySales.reduce((acc, sale) => {
    const day = format(new Date(sale.created_at), 'dd');
    if (!acc[day]) {
      acc[day] = { day, amount: 0, count: 0 };
    }
    acc[day].amount += sale.final_amount;
    acc[day].count += 1;
    return acc;
  }, {} as Record<string, { day: string; amount: number; count: number }>);

  const chartData = Object.values(dailySales).sort((a, b) => Number(a.day) - Number(b.day));

  const months = [
    { value: 1, label: 'ມັງກອນ' },
    { value: 2, label: 'ກຸມພາ' },
    { value: 3, label: 'ມີນາ' },
    { value: 4, label: 'ເມສາ' },
    { value: 5, label: 'ພຶດສະພາ' },
    { value: 6, label: 'ມິຖຸນາ' },
    { value: 7, label: 'ກໍລະກົດ' },
    { value: 8, label: 'ສິງຫາ' },
    { value: 9, label: 'ກັນຍາ' },
    { value: 10, label: 'ຕຸລາ' },
    { value: 11, label: 'ພະຈິກ' },
    { value: 12, label: 'ທັນວາ' },
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="space-y-4">
      {/* Date Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map(m => (
                  <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <ShoppingCart className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">ຈຳນວນບິນ</p>
                <p className="text-2xl font-bold">{totalSales}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">ຍອດຂາຍລວມ</p>
                <p className="text-2xl font-bold">₭{totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-yellow-600" />
              <div>
                <p className="text-sm text-muted-foreground">ສ່ວນຫຼຸດ</p>
                <p className="text-2xl font-bold">₭{totalDiscount.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">ສະເລ່ຍ/ບິນ</p>
                <p className="text-2xl font-bold">₭{avgSale.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>ກຣາບຍອດຂາຍລາຍວັນ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => [`₭${value.toLocaleString()}`, 'ຍອດຂາຍ']}
                  labelFormatter={(label) => `ວັນທີ ${label}`}
                />
                <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Sales List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            ລາຍການຂາຍ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ເລກບິນ</TableHead>
                  <TableHead>ວັນທີ/ເວລາ</TableHead>
                  <TableHead>ວິທີຊຳລະ</TableHead>
                  <TableHead className="text-right">ຍອດຮວມ</TableHead>
                  <TableHead className="text-right">ສ່ວນຫຼຸດ</TableHead>
                  <TableHead className="text-right">ສຸດທິ</TableHead>
                  <TableHead>ສະຖານະ</TableHead>
                  <TableHead className="text-right">ລາຍລະອຽດ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlySales.map(sale => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-mono text-sm">{sale.sale_number}</TableCell>
                    <TableCell>{format(new Date(sale.created_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {sale.payment_method === 'cash' ? 'ເງິນສົດ' : 
                         sale.payment_method === 'transfer' ? 'ໂອນ' : 'QR'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">₭{sale.total_amount.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-destructive">
                      {sale.discount_amount > 0 ? `-₭${sale.discount_amount.toLocaleString()}` : '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium">₭{sale.final_amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={sale.status === 'completed' ? 'default' : 'destructive'}>
                        {sale.status === 'completed' ? 'ສຳເລັດ' : 'ຍົກເລີກ'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleViewSaleItems(sale.id)}
                      >
                        ເບິ່ງ
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {monthlySales.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      ບໍ່ມີຂໍ້ມູນການຂາຍໃນເດືອນນີ້
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Sale Items Modal */}
      {selectedSaleId && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>ລາຍລະອຽດບິນ</span>
              <Button variant="ghost" size="sm" onClick={() => setSelectedSaleId(null)}>
                ປິດ
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ສິນຄ້າ</TableHead>
                  <TableHead className="text-right">ລາຄາ</TableHead>
                  <TableHead className="text-right">ຈຳນວນ</TableHead>
                  <TableHead className="text-right">ລວມ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedSaleItems.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.product_name}</TableCell>
                    <TableCell className="text-right">₭{item.unit_price.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right font-medium">₭{item.total_price.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
