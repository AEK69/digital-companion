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
  CreditCard
} from 'lucide-react';
import { TabType, AppRole, ROLE_PERMISSIONS } from '@/types';
import { useIsMobile } from '@/hooks/use-mobile';

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

const modules: ModuleItem[] = [
  { 
    id: 'pos', 
    label: 'ຂາຍສິນຄ້າ', 
    description: 'ລະບົບຂາຍ POS',
    icon: ShoppingCart, 
    color: 'bg-gradient-to-br from-primary to-primary/70' 
  },
  { 
    id: 'products', 
    label: 'ສິນຄ້າ', 
    description: 'ຈັດການສິນຄ້າ',
    icon: Package, 
    color: 'bg-gradient-to-br from-blue-600 to-blue-700',
    requiredPermission: 'canManageEmployees'
  },
  { 
    id: 'inventory', 
    label: 'ສະຕ໊ອກ', 
    description: 'ຈັດການສະຕ໊ອກ',
    icon: Warehouse, 
    color: 'bg-gradient-to-br from-amber-600 to-amber-700',
    requiredPermission: 'canManageEmployees'
  },
  { 
    id: 'salesreport', 
    label: 'ລາຍງານຂາຍ', 
    description: 'ເບິ່ງລາຍງານ',
    icon: Receipt, 
    color: 'bg-gradient-to-br from-green-600 to-green-700',
    requiredPermission: 'canViewFinance'
  },
  { 
    id: 'customers', 
    label: 'ລູກຄ້າ', 
    description: 'ຈັດການລູກຄ້າ',
    icon: UserCheck, 
    color: 'bg-gradient-to-br from-purple-600 to-purple-700',
    requiredPermission: 'canViewFinance'
  },
  { 
    id: 'promotions', 
    label: 'ໂປຣໂມຊັນ', 
    description: 'ຈັດການສ່ວນຫຼຸດ',
    icon: Tag, 
    color: 'bg-gradient-to-br from-pink-600 to-pink-700',
    requiredPermission: 'canViewFinance'
  },
  { 
    id: 'reorder', 
    label: 'ສັ່ງຊື້', 
    description: 'ແຈ້ງເຕືອນສິນຄ້າໝົດ',
    icon: AlertTriangle, 
    color: 'bg-gradient-to-br from-red-600 to-red-700',
    requiredPermission: 'canManageEmployees'
  },
  { 
    id: 'reservations', 
    label: 'ຈອງໂຕະ', 
    description: 'ຈັດການການຈອງ',
    icon: CalendarDays, 
    color: 'bg-gradient-to-br from-rose-600 to-rose-700',
    requiredPermission: 'canViewFinance'
  },
  { 
    id: 'credits', 
    label: 'ຕິດໜີ້', 
    description: 'ເບິ່ງລູກໜີ້ຄ້າງຈ່າຍ',
    icon: CreditCard, 
    color: 'bg-gradient-to-br from-orange-600 to-orange-700',
    requiredPermission: 'canViewFinance'
  },
  {
    id: 'dashboard',
    label: 'Dashboard', 
    description: 'ສະຖິຕິລວມ',
    icon: LayoutDashboard, 
    color: 'bg-gradient-to-br from-indigo-600 to-indigo-700',
    requiredPermission: 'canViewFinance'
  },
  { 
    id: 'attendance', 
    label: 'ເຂົ້າ-ອອກງານ', 
    description: 'ບັນທຶກເວລາ',
    icon: Clock, 
    color: 'bg-gradient-to-br from-cyan-600 to-cyan-700',
    requiredPermission: 'canViewAttendance'
  },
  { 
    id: 'income', 
    label: 'ລາຍຮັບ', 
    description: 'ບັນທຶກລາຍຮັບ',
    icon: TrendingUp, 
    color: 'bg-gradient-to-br from-emerald-600 to-emerald-700',
    requiredPermission: 'canViewFinance'
  },
  { 
    id: 'expense', 
    label: 'ລາຍຈ່າຍ', 
    description: 'ບັນທຶກລາຍຈ່າຍ',
    icon: TrendingDown, 
    color: 'bg-gradient-to-br from-orange-600 to-orange-700',
    requiredPermission: 'canViewFinance'
  },
  { 
    id: 'summary', 
    label: 'ສະຫຼຸບ', 
    description: 'ລາຍງານສະຫຼຸບ',
    icon: BarChart3, 
    color: 'bg-gradient-to-br from-teal-600 to-teal-700',
    requiredPermission: 'canViewFinance'
  },
  { 
    id: 'users', 
    label: 'ຜູ້ໃຊ້', 
    description: 'ຈັດການຜູ້ໃຊ້',
    icon: Users, 
    color: 'bg-gradient-to-br from-slate-600 to-slate-700',
    requiredPermission: 'canManageRoles'
  },
  { 
    id: 'settings', 
    label: 'ຕັ້ງຄ່າ', 
    description: 'ຕັ້ງຄ່າລະບົບ',
    icon: Settings, 
    color: 'bg-gradient-to-br from-gray-600 to-gray-700',
    requiredPermission: 'canViewSettings'
  },
];

export function HomeDashboard({ onNavigate, userRole }: HomeDashboardProps) {
  const permissions = userRole ? ROLE_PERMISSIONS[userRole] : null;
  const isMobile = useIsMobile();

  const visibleModules = modules.filter(module => {
    if (!module.requiredPermission) return true;
    if (!permissions) return false;
    return permissions[module.requiredPermission];
  });

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col overflow-hidden">
      {/* Header - Compact */}
      <div className="text-center py-2 lg:py-4 shrink-0">
        <h1 className="text-lg lg:text-2xl font-bold text-foreground animate-fade-in">ເລືອກໂມດູນ</h1>
        <p className="text-xs text-muted-foreground mt-0.5 animate-fade-in">ກົດເລືອກເພື່ອເຂົ້າໃຊ້ງານ</p>
      </div>

      {/* Module Grid - Optimized for all screens */}
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
                style={{ 
                  animationDelay: `${index * 50}ms`,
                  animationFillMode: 'forwards'
                }}
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
