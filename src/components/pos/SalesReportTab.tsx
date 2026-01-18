import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
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
  FileSpreadsheet,
  CalendarDays
} from 'lucide-react';
import { useSales, Sale, SaleItem } from '@/hooks/useSales';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { exportMonthlySalesToExcel, exportDailySalesToExcel } from '@/utils/excelExport';

export function SalesReportTab() {
  const { sales, getMonthlySales, getSaleItems } = useSales();
  
  const [reportType, setReportType] = useState<'daily' | 'monthly'>('daily');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
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

  // Filter daily sales
  const dailySalesData = monthlySales.filter(s => 
    format(new Date(s.created_at), 'yyyy-MM-dd') === selectedDate
  );

  // Calculate monthly statistics
  const totalSales = monthlySales.length;
  const totalRevenue = monthlySales.reduce((sum, s) => sum + s.final_amount, 0);
  const totalDiscount = monthlySales.reduce((sum, s) => sum + s.discount_amount, 0);
  const avgSale = totalSales > 0 ? totalRevenue / totalSales : 0;

  // Daily stats
  const dailyTotalSales = dailySalesData.length;
  const dailyTotalRevenue = dailySalesData.reduce((sum, s) => sum + s.final_amount, 0);
  const dailyTotalDiscount = dailySalesData.reduce((sum, s) => sum + s.discount_amount, 0);

  // Group sales by day for chart
  const dailyChart = monthlySales.reduce((acc, sale) => {
    const day = format(new Date(sale.created_at), 'dd');
    if (!acc[day]) {
      acc[day] = { day, amount: 0, count: 0 };
    }
    acc[day].amount += sale.final_amount;
    acc[day].count += 1;
    return acc;
  }, {} as Record<string, { day: string; amount: number; count: number }>);

  const chartData = Object.values(dailyChart).sort((a, b) => Number(a.day) - Number(b.day));

  // Group by payment method for pie chart
  const paymentMethodData = monthlySales.reduce((acc, sale) => {
    const method = sale.payment_method;
    if (!acc[method]) {
      acc[method] = { name: method === 'cash' ? 'ເງິນສົດ' : method === 'transfer' ? 'ໂອນ' : 'QR', value: 0 };
    }
    acc[method].value += sale.final_amount;
    return acc;
  }, {} as Record<string, { name: string; value: number }>);

  const pieChartData = Object.values(paymentMethodData);
  const COLORS = ['#22c55e', '#3b82f6', '#a855f7'];

  // Hourly sales for daily view
  const hourlySales = dailySalesData.reduce((acc, sale) => {
    const hour = format(new Date(sale.created_at), 'HH');
    if (!acc[hour]) {
      acc[hour] = { hour: `${hour}:00`, amount: 0, count: 0 };
    }
    acc[hour].amount += sale.final_amount;
    acc[hour].count += 1;
    return acc;
  }, {} as Record<string, { hour: string; amount: number; count: number }>);

  const hourlyChartData = Object.values(hourlySales).sort((a, b) => a.hour.localeCompare(b.hour));

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

  const handleExportExcel = () => {
    if (reportType === 'daily') {
      exportDailySalesToExcel(dailySalesData, new Date(selectedDate));
    } else {
      exportMonthlySalesToExcel(monthlySales, selectedYear, selectedMonth);
    }
  };

  return (
    <div className="space-y-4">
      {/* Report Type Selector */}
      <Card>
        <CardContent className="p-4">
          <Tabs value={reportType} onValueChange={(v) => setReportType(v as 'daily' | 'monthly')}>
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="daily" className="gap-2">
                  <CalendarDays className="w-4 h-4" />
                  ລາຍວັນ
                </TabsTrigger>
                <TabsTrigger value="monthly" className="gap-2">
                  <Calendar className="w-4 h-4" />
                  ລາຍເດືອນ
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
                {reportType === 'daily' ? (
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      const d = new Date(e.target.value);
                      setSelectedYear(d.getFullYear());
                      setSelectedMonth(d.getMonth() + 1);
                    }}
                    className="w-[180px]"
                  />
                ) : (
                  <>
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
                  </>
                )}

                <Button variant="outline" onClick={handleExportExcel}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  ສົ່ງອອກ Excel
                </Button>
              </div>
            </div>
          </Tabs>
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
                <p className="text-2xl font-bold">
                  {reportType === 'daily' ? dailyTotalSales : totalSales}
                </p>
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
                <p className="text-2xl font-bold">
                  ₭{(reportType === 'daily' ? dailyTotalRevenue : totalRevenue).toLocaleString()}
                </p>
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
                <p className="text-2xl font-bold">
                  ₭{(reportType === 'daily' ? dailyTotalDiscount : totalDiscount).toLocaleString()}
                </p>
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
                <p className="text-2xl font-bold">
                  ₭{(reportType === 'daily' 
                    ? (dailyTotalSales > 0 ? dailyTotalRevenue / dailyTotalSales : 0)
                    : avgSale
                  ).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              {reportType === 'daily' ? 'ກຣາບຍອດຂາຍລາຍຊົ່ວໂມງ' : 'ກຣາບຍອດຂາຍລາຍວັນ'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                {reportType === 'daily' ? (
                  <LineChart data={hourlyChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: number) => [`₭${value.toLocaleString()}`, 'ຍອດຂາຍ']}
                    />
                    <Line type="monotone" dataKey="amount" stroke="hsl(var(--primary))" strokeWidth={2} />
                  </LineChart>
                ) : (
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
                )}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ແບ່ງຕາມວິທີຊຳລະ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `₭${value.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

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
                {(reportType === 'daily' ? dailySalesData : monthlySales).map(sale => (
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
                {(reportType === 'daily' ? dailySalesData : monthlySales).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      ບໍ່ມີຂໍ້ມູນການຂາຍ
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
