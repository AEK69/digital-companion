import { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  Package, 
  Warehouse, 
  Receipt, 
  UserCheck, 
  BarChart3,
  Users,
  Clock,
  TrendingUp,
  TrendingDown,
  Settings,
  LayoutDashboard,
  Tag,
  AlertTriangle,
  CalendarDays,
  CreditCard,
  DollarSign,
  PackageX,
  ArrowUpRight
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TabType, AppRole, ROLE_PERMISSIONS } from '@/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns';

interface HomeDashboardProps {
  onNavigate: (tab: TabType) => void;
  userRole?: AppRole | null;
}

interface ModuleItem {
  id: TabType;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  requiredPermission?: keyof typeof ROLE_PERMISSIONS['admin'];
}

interface QuickStats {
  todaySales: number;
  todayProfit: number;
  monthSales: number;
  totalDebt: number;
  lowStockCount: number;
  todayBills: number;
}

const modules: ModuleItem[] = [
  { id: 'pos', label: 'ຂາຍສິນຄ້າ', description: 'ລະບົບຂາຍ POS', icon: ShoppingCart, color: 'bg-gradient-to-br from-primary to-primary/70' },
  { id: 'products', label: 'ສິນຄ້າ', description: 'ຈັດການສິນຄ້າ', icon: Package, color: 'bg-gradient-to-br from-blue-600 to-blue-700', requiredPermission: 'canManageEmployees' },
  { id: 'inventory', label: 'ສະຕ໊ອກ', description: 'ຈັດການສະຕ໊ອກ', icon: Warehouse, color: 'bg-gradient-to-br from-amber-600 to-amber-700', requiredPermission: 'canManageEmployees' },
  { id: 'salesreport', label: 'ລາຍງານຂາຍ', description: 'ເບິ່ງລາຍງານ', icon: Receipt, color: 'bg-gradient-to-br from-green-600 to-green-700', requiredPermission: 'canViewFinance' },
  { id: 'customers', label: 'ລູກຄ້າ', description: 'ຈັດການລູກຄ້າ', icon: UserCheck, color: 'bg-gradient-to-br from-purple-600 to-purple-700', requiredPermission: 'canViewFinance' },
  { id: 'promotions', label: 'ໂປຣໂມຊັນ', description: 'ຈັດການສ່ວນຫຼຸດ', icon: Tag, color: 'bg-gradient-to-br from-pink-600 to-pink-700', requiredPermission: 'canViewFinance' },
  { id: 'reorder', label: 'ສັ່ງຊື້', description: 'ແຈ້ງເຕືອນສິນຄ້າໝົດ', icon: AlertTriangle, color: 'bg-gradient-to-br from-red-600 to-red-700', requiredPermission: 'canManageEmployees' },
  { id: 'reservations', label: 'ຈອງໂຕະ', description: 'ຈັດການການຈອງ', icon: CalendarDays, color: 'bg-gradient-to-br from-rose-600 to-rose-700', requiredPermission: 'canViewFinance' },
  { id: 'credits', label: 'ຕິດໜີ້', description: 'ເບິ່ງລູກໜີ້ຄ້າງຈ່າຍ', icon: CreditCard, color: 'bg-gradient-to-br from-orange-600 to-orange-700', requiredPermission: 'canViewFinance' },
  { id: 'dashboard', label: 'Dashboard', description: 'ສະຖິຕິລວມ', icon: LayoutDashboard, color: 'bg-gradient-to-br from-indigo-600 to-indigo-700', requiredPermission: 'canViewFinance' },
  { id: 'attendance', label: 'ເຂົ້າ-ອອກງານ', description: 'ບັນທຶກເວລາ', icon: Clock, color: 'bg-gradient-to-br from-cyan-600 to-cyan-700', requiredPermission: 'canViewAttendance' },
  { id: 'income', label: 'ລາຍຮັບ', description: 'ບັນທຶກລາຍຮັບ', icon: TrendingUp, color: 'bg-gradient-to-br from-emerald-600 to-emerald-700', requiredPermission: 'canViewFinance' },
  { id: 'expense', label: 'ລາຍຈ່າຍ', description: 'ບັນທຶກລາຍຈ່າຍ', icon: TrendingDown, color: 'bg-gradient-to-br from-orange-600 to-orange-700', requiredPermission: 'canViewFinance' },
  { id: 'summary', label: 'ສະຫຼຸບ', description: 'ລາຍງານສະຫຼຸບ', icon: BarChart3, color: 'bg-gradient-to-br from-teal-600 to-teal-700', requiredPermission: 'canViewFinance' },
  { id: 'users', label: 'ຜູ້ໃຊ້', description: 'ຈັດການຜູ້ໃຊ້', icon: Users, color: 'bg-gradient-to-br from-slate-600 to-slate-700', requiredPermission: 'canManageRoles' },
  { id: 'settings', label: 'ຕັ້ງຄ່າ', description: 'ຕັ້ງຄ່າລະບົບ', icon: Settings, color: 'bg-gradient-to-br from-gray-600 to-gray-700', requiredPermission: 'canViewSettings' },
];

export function HomeDashboard({ onNavigate, userRole }: HomeDashboardProps) {
  const permissions = userRole ? ROLE_PERMISSIONS[userRole] : null;
  const isMobile = useIsMobile();
  const [stats, setStats] = useState<QuickStats>({ todaySales: 0, todayProfit: 0, monthSales: 0, totalDebt: 0, lowStockCount: 0, todayBills: 0 });

  const canViewFinance = permissions?.canViewFinance;

  useEffect(() => {
    if (!canViewFinance) return;
    
    const fetchStats = async () => {
      const today = new Date();
      const startToday = startOfDay(today).toISOString();
      const endToday = endOfDay(today).toISOString();
      const startMonth = startOfMonth(today).toISOString();
      const endMonth = endOfMonth(today).toISOString();

      const [salesRes, monthRes, debtRes, lowStockRes] = await Promise.all([
        supabase.from('sales').select('id, final_amount').gte('created_at', startToday).lte('created_at', endToday).eq('status', 'completed'),
        supabase.from('sales').select('final_amount').gte('created_at', startMonth).lte('created_at', endMonth).eq('status', 'completed'),
        supabase.from('credit_sales').select('remaining_amount').neq('status', 'paid'),
        supabase.from('products').select('id').lt('stock_quantity', 5).eq('is_active', true),
      ]);

      const todaySales = (salesRes.data || []).reduce((s, r) => s + r.final_amount, 0);
      const todayBills = (salesRes.data || []).length;
      const monthSales = (monthRes.data || []).reduce((s, r) => s + r.final_amount, 0);
      const totalDebt = (debtRes.data || []).reduce((s, r) => s + r.remaining_amount, 0);
      const lowStockCount = lowStockRes.data?.length || 0;

      // Calculate profit from cost prices
      let todayProfit = todaySales;
      if (salesRes.data && salesRes.data.length > 0) {
        const saleIds = salesRes.data.map(s => s.id);
        const { data: items } = await supabase.from('sale_items').select('quantity, total_price, product_id').in('sale_id', saleIds);
        if (items && items.length > 0) {
          const productIds = [...new Set(items.map(i => i.product_id))];
          const { data: products } = await supabase.from('products').select('id, cost_price').in('id', productIds);
          const costMap = new Map((products || []).map(p => [p.id, p.cost_price]));
          const totalCost = items.reduce((sum, item) => sum + (costMap.get(item.product_id) || 0) * item.quantity, 0);
          todayProfit = todaySales - totalCost;
        }
      }

      setStats({ todaySales, todayProfit, monthSales, totalDebt, lowStockCount, todayBills });
    };
    fetchStats();
  }, [canViewFinance]);

  const visibleModules = modules.filter(module => {
    if (!module.requiredPermission) return true;
    if (!permissions) return false;
    return permissions[module.requiredPermission];
  });

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col overflow-hidden">
      {/* Quick Stats - Only for finance roles */}
      {canViewFinance && (
        <div className="px-2 lg:px-4 pt-2 shrink-0">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-1.5 lg:gap-2">
            <Card className="bg-primary/10 border-primary/20 cursor-pointer hover:bg-primary/15 transition-colors" onClick={() => onNavigate('dashboard')}>
              <CardContent className="p-2 lg:p-3">
                <div className="flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[9px] lg:text-[10px] text-muted-foreground truncate">ຂາຍມື້ນີ້</p>
                    <p className="text-xs lg:text-sm font-bold text-primary truncate">₭{stats.todaySales.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-green-500/10 border-green-500/20 cursor-pointer hover:bg-green-500/15 transition-colors" onClick={() => onNavigate('dashboard')}>
              <CardContent className="p-2 lg:p-3">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-green-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[9px] lg:text-[10px] text-muted-foreground truncate">ກຳໄລມື້ນີ້</p>
                    <p className="text-xs lg:text-sm font-bold text-green-600 truncate">₭{stats.todayProfit.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-blue-500/10 border-blue-500/20 cursor-pointer hover:bg-blue-500/15 transition-colors" onClick={() => onNavigate('salesreport')}>
              <CardContent className="p-2 lg:p-3">
                <div className="flex items-center gap-1.5">
                  <ShoppingCart className="w-4 h-4 text-blue-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[9px] lg:text-[10px] text-muted-foreground truncate">ບິນມື້ນີ້</p>
                    <p className="text-xs lg:text-sm font-bold text-blue-600">{stats.todayBills}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-indigo-500/10 border-indigo-500/20 cursor-pointer hover:bg-indigo-500/15 transition-colors" onClick={() => onNavigate('salesreport')}>
              <CardContent className="p-2 lg:p-3">
                <div className="flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-indigo-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[9px] lg:text-[10px] text-muted-foreground truncate">ເດືອນນີ້</p>
                    <p className="text-xs lg:text-sm font-bold text-indigo-600 truncate">₭{stats.monthSales.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-destructive/10 border-destructive/20 cursor-pointer hover:bg-destructive/15 transition-colors" onClick={() => onNavigate('credits')}>
              <CardContent className="p-2 lg:p-3">
                <div className="flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-destructive shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[9px] lg:text-[10px] text-muted-foreground truncate">ໜີ້ຄ້າງ</p>
                    <p className="text-xs lg:text-sm font-bold text-destructive truncate">₭{stats.totalDebt.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className={`${stats.lowStockCount > 0 ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-muted/50 border-muted'} cursor-pointer hover:opacity-80 transition-colors`} onClick={() => onNavigate('inventory')}>
              <CardContent className="p-2 lg:p-3">
                <div className="flex items-center gap-1.5">
                  <PackageX className="w-4 h-4 text-yellow-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[9px] lg:text-[10px] text-muted-foreground truncate">ໃກ້ໝົດ</p>
                    <p className="text-xs lg:text-sm font-bold text-yellow-600">{stats.lowStockCount} ລາຍການ</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="text-center py-2 lg:py-3 shrink-0">
        <h1 className="text-lg lg:text-2xl font-bold text-foreground animate-fade-in">ເລືອກໂມດູນ</h1>
      </div>

      {/* Module Grid */}
      <div className="flex-1 overflow-auto px-2 lg:px-4 pb-2">
        <div className={`grid gap-2 lg:gap-3 ${
          isMobile 
            ? 'grid-cols-3 auto-rows-fr' 
            : 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8'
        }`}>
          {visibleModules.map((module, index) => {
            const Icon = module.icon;
            return (
              <button
                key={module.id}
                onClick={() => onNavigate(module.id)}
                className={`${module.color} text-white rounded-xl p-2 lg:p-3 flex flex-col items-center justify-center gap-1.5 
                  transition-all duration-300 ease-out
                  shadow-lg hover:shadow-xl 
                  hover:scale-105 hover:-translate-y-1
                  active:scale-95 active:translate-y-0
                  min-h-[70px] lg:min-h-[90px]
                  animate-scale-in opacity-0
                  glow-primary
                `}
                style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'forwards' }}
              >
                <div className="p-1.5 lg:p-2 rounded-full bg-white/20 backdrop-blur-sm">
                  <Icon className="w-5 h-5 lg:w-7 lg:h-7" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-[10px] lg:text-sm leading-tight truncate max-w-full">{module.label}</p>
                  <p className="text-[8px] lg:text-xs opacity-80 hidden sm:block truncate max-w-full">{module.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
