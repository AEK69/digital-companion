import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { 
  TrendingUp, TrendingDown, ShoppingCart, DollarSign, Package, Clock, RefreshCw, CreditCard, Percent
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns';
import { Button } from '@/components/ui/button';

interface DashboardData {
  todaySales: number;
  todayTransactions: number;
  todayCost: number;
  todayProfit: number;
  monthSales: number;
  monthCost: number;
  monthProfit: number;
  totalDebt: number;
  recentSales: any[];
  hourlyData: { hour: string; amount: number; transactions: number }[];
  paymentMethodData: { name: string; value: number }[];
  topProducts: { name: string; quantity: number; revenue: number; cost: number; profit: number }[];
  slowProducts: { name: string; quantity: number; revenue: number }[];
}

const COLORS = ['hsl(var(--primary))', '#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

export function DashboardTab() {
  const [data, setData] = useState<DashboardData>({
    todaySales: 0, todayTransactions: 0, todayCost: 0, todayProfit: 0,
    monthSales: 0, monthCost: 0, monthProfit: 0, totalDebt: 0,
    recentSales: [], hourlyData: [], paymentMethodData: [],
    topProducts: [], slowProducts: [],
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchDashboardData = async () => {
    try {
      const today = new Date();
      const startToday = startOfDay(today).toISOString();
      const endToday = endOfDay(today).toISOString();
      const startMonth = startOfMonth(today).toISOString();
      const endMonth = endOfMonth(today).toISOString();

      const [todaySalesRes, monthSalesRes, recentRes, debtRes] = await Promise.all([
        supabase.from('sales').select('*').gte('created_at', startToday).lte('created_at', endToday).eq('status', 'completed'),
        supabase.from('sales').select('id, final_amount').gte('created_at', startMonth).lte('created_at', endMonth).eq('status', 'completed'),
        supabase.from('sales').select('*, employees(name)').eq('status', 'completed').order('created_at', { ascending: false }).limit(10),
        supabase.from('credit_sales').select('remaining_amount').neq('status', 'paid'),
      ]);

      const todaySalesData = todaySalesRes.data || [];
      const monthSalesData = monthSalesRes.data || [];
      const totalDebt = (debtRes.data || []).reduce((s, r) => s + r.remaining_amount, 0);

      // Get sale items for profit calculation
      const allSaleIds = monthSalesData.map(s => s.id);
      let allItems: any[] = [];
      if (allSaleIds.length > 0) {
        // Batch in chunks of 100
        for (let i = 0; i < allSaleIds.length; i += 100) {
          const chunk = allSaleIds.slice(i, i + 100);
          const { data: items } = await supabase.from('sale_items').select('sale_id, product_id, product_name, quantity, unit_price, total_price').in('sale_id', chunk);
          if (items) allItems.push(...items);
        }
      }

      // Get cost prices
      const productIds = [...new Set(allItems.map(i => i.product_id))];
      let costMap = new Map<string, number>();
      if (productIds.length > 0) {
        const { data: products } = await supabase.from('products').select('id, cost_price').in('id', productIds);
        costMap = new Map((products || []).map(p => [p.id, p.cost_price]));
      }

      const todaySaleIds = new Set(todaySalesData.map(s => s.id));
      const todayItems = allItems.filter(i => todaySaleIds.has(i.sale_id));

      const todaySales = todaySalesData.reduce((s, r) => s + r.final_amount, 0);
      const todayCost = todayItems.reduce((s, i) => s + (costMap.get(i.product_id) || 0) * i.quantity, 0);
      const monthSales = monthSalesData.reduce((s, r) => s + r.final_amount, 0);
      const monthCost = allItems.reduce((s, i) => s + (costMap.get(i.product_id) || 0) * i.quantity, 0);

      // Top products (by revenue, with profit)
      const productAgg = new Map<string, { name: string; quantity: number; revenue: number; cost: number }>();
      allItems.forEach(item => {
        const ex = productAgg.get(item.product_id) || { name: item.product_name, quantity: 0, revenue: 0, cost: 0 };
        ex.quantity += item.quantity;
        ex.revenue += item.total_price;
        ex.cost += (costMap.get(item.product_id) || 0) * item.quantity;
        productAgg.set(item.product_id, ex);
      });
      const productList = Array.from(productAgg.values());
      const topProducts = productList.sort((a, b) => b.revenue - a.revenue).slice(0, 10).map(p => ({ ...p, profit: p.revenue - p.cost }));
      const slowProducts = productList.sort((a, b) => a.quantity - b.quantity).slice(0, 5);

      // Hourly data
      const hourlyMap = new Map<number, { amount: number; transactions: number }>();
      for (let i = 0; i < 24; i++) hourlyMap.set(i, { amount: 0, transactions: 0 });
      todaySalesData.forEach(sale => {
        const h = new Date(sale.created_at).getHours();
        const ex = hourlyMap.get(h)!;
        hourlyMap.set(h, { amount: ex.amount + sale.final_amount, transactions: ex.transactions + 1 });
      });
      const hourlyData = Array.from(hourlyMap.entries()).map(([h, d]) => ({ hour: `${h.toString().padStart(2, '0')}:00`, ...d }));

      // Payment methods
      const paymentMap = new Map<string, number>();
      todaySalesData.forEach(s => {
        const m = s.payment_method === 'cash' ? 'ເງິນສົດ' : s.payment_method === 'transfer' ? 'ໂອນ' : s.payment_method === 'credit' ? 'ຕິດໜີ້' : 'QR';
        paymentMap.set(m, (paymentMap.get(m) || 0) + s.final_amount);
      });
      const paymentMethodData = Array.from(paymentMap.entries()).map(([name, value]) => ({ name, value }));

      setData({
        todaySales, todayTransactions: todaySalesData.length, todayCost, todayProfit: todaySales - todayCost,
        monthSales, monthCost, monthProfit: monthSales - monthCost, totalDebt,
        recentSales: recentRes.data || [], hourlyData, paymentMethodData, topProducts, slowProducts,
      });
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const channel = supabase.channel('dashboard-sales').on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => fetchDashboardData()).subscribe();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => { supabase.removeChannel(channel); clearInterval(interval); };
  }, []);

  const fmt = (n: number) => n.toLocaleString('en-US');
  const profitMargin = data.todaySales > 0 ? ((data.todayProfit / data.todaySales) * 100).toFixed(1) : '0';
  const monthProfitMargin = data.monthSales > 0 ? ((data.monthProfit / data.monthSales) * 100).toFixed(1) : '0';

  if (loading) return <div className="flex items-center justify-center h-64"><RefreshCw className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dashboard</h2>
          <p className="text-sm text-muted-foreground">ອັບເດດລ່າສຸດ: {format(lastUpdate, 'HH:mm:ss')}</p>
        </div>
        <Button variant="outline" onClick={fetchDashboardData}><RefreshCw className="w-4 h-4 mr-2" />ໂຫຼດໃໝ່</Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">ຍອດຂາຍມື້ນີ້</p>
            <p className="text-xl font-bold mt-1">₭{fmt(data.todaySales)}</p>
            <p className="text-[10px] text-muted-foreground">{data.todayTransactions} ບິນ</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">ກຳໄລມື້ນີ້</p>
            <p className="text-xl font-bold text-green-600 mt-1">₭{fmt(data.todayProfit)}</p>
            <p className="text-[10px] text-green-600">{profitMargin}% margin</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">ຕົ້ນທຶນມື້ນີ້</p>
            <p className="text-xl font-bold text-red-600 mt-1">₭{fmt(data.todayCost)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">ຍອດຂາຍເດືອນ</p>
            <p className="text-xl font-bold text-blue-600 mt-1">₭{fmt(data.monthSales)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">ກຳໄລເດືອນ</p>
            <p className="text-xl font-bold text-emerald-600 mt-1">₭{fmt(data.monthProfit)}</p>
            <p className="text-[10px] text-emerald-600">{monthProfitMargin}% margin</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">ຕົ້ນທຶນເດືອນ</p>
            <p className="text-xl font-bold text-amber-600 mt-1">₭{fmt(data.monthCost)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">ໜີ້ຄ້າງທັງໝົດ</p>
            <p className="text-xl font-bold text-orange-600 mt-1">₭{fmt(data.totalDebt)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">ກຳໄລສຸດທິ</p>
            <p className="text-xl font-bold text-purple-600 mt-1">₭{fmt(data.monthProfit - data.totalDebt)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5" />ຍອດຂາຍຕາມຊົ່ວໂມງ</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.hourlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={2} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => [`₭${fmt(v)}`, 'ຍອດຂາຍ']} />
                <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="w-5 h-5" />ວິທີຊຳລະເງິນ</CardTitle></CardHeader>
          <CardContent>
            {data.paymentMethodData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={data.paymentMethodData} cx="50%" cy="50%" labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80} dataKey="value">
                    {data.paymentMethodData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`₭${fmt(v)}`, 'ຍອດເງິນ']} />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="flex items-center justify-center h-[250px] text-muted-foreground">ຍັງບໍ່ມີຂໍ້ມູນ</div>}
          </CardContent>
        </Card>
      </div>

      {/* Products Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Products */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2"><Package className="w-5 h-5" />ສິນຄ້າຂາຍດີເດືອນນີ້ (Top 10)</CardTitle></CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {data.topProducts.length > 0 ? (
                <div className="space-y-2">
                  {data.topProducts.map((p, i) => (
                    <div key={p.name} className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/50">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant={i < 3 ? 'default' : 'secondary'} className="shrink-0">#{i + 1}</Badge>
                        <span className="font-medium text-sm truncate">{p.name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">{p.quantity} ຊິ້ນ</span>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className="font-bold text-sm">₭{fmt(p.revenue)}</p>
                        <p className={`text-[10px] ${p.profit >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                          ກຳໄລ ₭{fmt(p.profit)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <div className="text-center py-8 text-muted-foreground">ຍັງບໍ່ມີຂໍ້ມູນ</div>}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Slow Products */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><TrendingDown className="w-5 h-5" />ສິນຄ້າຂາຍບໍ່ດີ</CardTitle></CardHeader>
          <CardContent>
            {data.slowProducts.length > 0 ? (
              <div className="space-y-2">
                {data.slowProducts.map((p) => (
                  <div key={p.name} className="flex items-center justify-between p-2.5 rounded-lg bg-destructive/5">
                    <span className="font-medium text-sm truncate">{p.name}</span>
                    <div className="text-right shrink-0 ml-2">
                      <p className="text-xs text-muted-foreground">{p.quantity} ຊິ້ນ</p>
                      <p className="text-sm">₭{fmt(p.revenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : <div className="text-center py-8 text-muted-foreground">ຍັງບໍ່ມີຂໍ້ມູນ</div>}
          </CardContent>
        </Card>
      </div>

      {/* Recent Sales */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><ShoppingCart className="w-5 h-5" />ການຂາຍລ່າສຸດ</CardTitle></CardHeader>
        <CardContent>
          <ScrollArea className="h-[280px]">
            {data.recentSales.length > 0 ? (
              <div className="space-y-2">
                {data.recentSales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <div>
                      <p className="font-medium">{sale.sale_number}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(sale.created_at), 'HH:mm')} • {sale.employees?.name || 'ບໍ່ລະບຸ'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">₭{fmt(sale.final_amount)}</p>
                      <Badge variant="outline" className="text-xs">
                        {sale.payment_method === 'cash' ? 'ເງິນສົດ' : sale.payment_method === 'transfer' ? 'ໂອນ' : sale.payment_method === 'credit' ? 'ຕິດໜີ້' : 'QR'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : <div className="text-center py-8 text-muted-foreground">ຍັງບໍ່ມີການຂາຍ</div>}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
