import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  ShoppingCart, 
  DollarSign,
  Users,
  Package,
  Clock,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { Button } from '@/components/ui/button';

interface DashboardData {
  todaySales: number;
  todayTransactions: number;
  todayProfit: number;
  monthSales: number;
  recentSales: any[];
  hourlyData: { hour: string; amount: number; transactions: number }[];
  paymentMethodData: { name: string; value: number }[];
  topProducts: { name: string; quantity: number; revenue: number }[];
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', '#10b981', '#f59e0b', '#ef4444'];

export function DashboardTab() {
  const [data, setData] = useState<DashboardData>({
    todaySales: 0,
    todayTransactions: 0,
    todayProfit: 0,
    monthSales: 0,
    recentSales: [],
    hourlyData: [],
    paymentMethodData: [],
    topProducts: [],
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchDashboardData = async () => {
    try {
      const today = new Date();
      const startOfToday = startOfDay(today).toISOString();
      const endOfToday = endOfDay(today).toISOString();
      const startOfCurrentMonth = startOfMonth(today).toISOString();
      const endOfCurrentMonth = endOfMonth(today).toISOString();

      // Fetch today's sales
      const { data: todaySalesData } = await supabase
        .from('sales')
        .select('*')
        .gte('created_at', startOfToday)
        .lte('created_at', endOfToday)
        .eq('status', 'completed');

      // Fetch month sales
      const { data: monthSalesData } = await supabase
        .from('sales')
        .select('final_amount')
        .gte('created_at', startOfCurrentMonth)
        .lte('created_at', endOfCurrentMonth)
        .eq('status', 'completed');

      // Fetch recent sales with employee info
      const { data: recentSalesData } = await supabase
        .from('sales')
        .select('*, employees(name)')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(10);

      // Fetch today's sale items for top products
      const todaySaleIds = (todaySalesData || []).map(s => s.id);
      let topProducts: { name: string; quantity: number; revenue: number }[] = [];
      
      if (todaySaleIds.length > 0) {
        const { data: saleItemsData } = await supabase
          .from('sale_items')
          .select('product_name, quantity, total_price')
          .in('sale_id', todaySaleIds);

        // Aggregate by product
        const productMap = new Map<string, { quantity: number; revenue: number }>();
        (saleItemsData || []).forEach(item => {
          const existing = productMap.get(item.product_name) || { quantity: 0, revenue: 0 };
          productMap.set(item.product_name, {
            quantity: existing.quantity + item.quantity,
            revenue: existing.revenue + item.total_price,
          });
        });

        topProducts = Array.from(productMap.entries())
          .map(([name, data]) => ({ name, ...data }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5);
      }

      // Calculate hourly data
      const hourlyMap = new Map<number, { amount: number; transactions: number }>();
      for (let i = 0; i < 24; i++) {
        hourlyMap.set(i, { amount: 0, transactions: 0 });
      }
      (todaySalesData || []).forEach(sale => {
        const hour = new Date(sale.created_at).getHours();
        const existing = hourlyMap.get(hour) || { amount: 0, transactions: 0 };
        hourlyMap.set(hour, {
          amount: existing.amount + sale.final_amount,
          transactions: existing.transactions + 1,
        });
      });
      const hourlyData = Array.from(hourlyMap.entries()).map(([hour, data]) => ({
        hour: `${hour.toString().padStart(2, '0')}:00`,
        ...data,
      }));

      // Payment method breakdown
      const paymentMap = new Map<string, number>();
      (todaySalesData || []).forEach(sale => {
        const method = sale.payment_method === 'cash' ? 'ເງິນສົດ' : 
                       sale.payment_method === 'transfer' ? 'ໂອນ' : 'QR';
        paymentMap.set(method, (paymentMap.get(method) || 0) + sale.final_amount);
      });
      const paymentMethodData = Array.from(paymentMap.entries()).map(([name, value]) => ({
        name,
        value,
      }));

      // Calculate totals
      const todaySales = (todaySalesData || []).reduce((sum, s) => sum + s.final_amount, 0);
      const todayTransactions = (todaySalesData || []).length;
      const monthSales = (monthSalesData || []).reduce((sum, s) => sum + s.final_amount, 0);

      setData({
        todaySales,
        todayTransactions,
        todayProfit: todaySales * 0.3, // Estimate 30% profit margin
        monthSales,
        recentSales: recentSalesData || [],
        hourlyData,
        paymentMethodData,
        topProducts,
      });
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and real-time subscription
  useEffect(() => {
    fetchDashboardData();

    // Subscribe to real-time sales updates
    const channel = supabase
      .channel('dashboard-sales')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sales',
        },
        () => {
          console.log('Sales updated, refreshing dashboard...');
          fetchDashboardData();
        }
      )
      .subscribe();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const formatNumber = (num: number) => num.toLocaleString('en-US');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            ອັບເດດລ່າສຸດ: {format(lastUpdate, 'HH:mm:ss')}
          </p>
        </div>
        <Button variant="outline" onClick={fetchDashboardData}>
          <RefreshCw className="w-4 h-4 mr-2" />
          ໂຫຼດໃໝ່
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">ຍອດຂາຍມື້ນີ້</p>
                <p className="text-3xl font-bold mt-1">₭{formatNumber(data.todaySales)}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">ບິນມື້ນີ້</p>
                <p className="text-3xl font-bold mt-1">{data.todayTransactions}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">ຍອດຂາຍເດືອນນີ້</p>
                <p className="text-3xl font-bold mt-1">₭{formatNumber(data.monthSales)}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">ກຳໄລໂດຍປະມານ</p>
                <p className="text-3xl font-bold mt-1">₭{formatNumber(data.todayProfit)}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Hourly Sales Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              ຍອດຂາຍຕາມຊົ່ວໂມງ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.hourlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="hour" 
                  tick={{ fontSize: 10 }}
                  interval={2}
                />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip 
                  formatter={(value: number) => [`₭${formatNumber(value)}`, 'ຍອດຂາຍ']}
                  labelFormatter={(label) => `ເວລາ: ${label}`}
                />
                <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payment Method Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              ວິທີຊຳລະເງິນ
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.paymentMethodData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={data.paymentMethodData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {data.paymentMethodData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`₭${formatNumber(value)}`, 'ຍອດເງິນ']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                ຍັງບໍ່ມີຂໍ້ມູນ
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              ສິນຄ້າຂາຍດີມື້ນີ້
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.topProducts.length > 0 ? (
              <div className="space-y-3">
                {data.topProducts.map((product, index) => (
                  <div key={product.name} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <div className="flex items-center gap-3">
                      <Badge variant={index === 0 ? 'default' : 'secondary'}>
                        #{index + 1}
                      </Badge>
                      <span className="font-medium">{product.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">₭{formatNumber(product.revenue)}</p>
                      <p className="text-xs text-muted-foreground">{product.quantity} ຊິ້ນ</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                ຍັງບໍ່ມີການຂາຍມື້ນີ້
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Sales */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              ການຂາຍລ່າສຸດ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[280px]">
              {data.recentSales.length > 0 ? (
                <div className="space-y-2">
                  {data.recentSales.map((sale) => (
                    <div key={sale.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                      <div>
                        <p className="font-medium">{sale.sale_number}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(sale.created_at), 'HH:mm')} • {sale.employees?.name || 'ບໍ່ລະບຸ'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">₭{formatNumber(sale.final_amount)}</p>
                        <Badge variant="outline" className="text-xs">
                          {sale.payment_method === 'cash' ? 'ເງິນສົດ' : 
                           sale.payment_method === 'transfer' ? 'ໂອນ' : 'QR'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  ຍັງບໍ່ມີການຂາຍ
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
