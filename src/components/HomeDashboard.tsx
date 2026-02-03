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
  AlertTriangle
} from 'lucide-react';
import { TabType, AppRole, ROLE_PERMISSIONS } from '@/types';

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
    color: 'bg-primary hover:bg-primary/90' 
  },
  { 
    id: 'products', 
    label: 'ສິນຄ້າ', 
    description: 'ຈັດການສິນຄ້າ',
    icon: Package, 
    color: 'bg-blue-600 hover:bg-blue-700',
    requiredPermission: 'canManageEmployees'
  },
  { 
    id: 'inventory', 
    label: 'ສະຕ໊ອກ', 
    description: 'ຈັດການສະຕ໊ອກ',
    icon: Warehouse, 
    color: 'bg-amber-600 hover:bg-amber-700',
    requiredPermission: 'canManageEmployees'
  },
  { 
    id: 'salesreport', 
    label: 'ລາຍງານຂາຍ', 
    description: 'ເບິ່ງລາຍງານ',
    icon: Receipt, 
    color: 'bg-green-600 hover:bg-green-700',
    requiredPermission: 'canViewFinance'
  },
  { 
    id: 'customers', 
    label: 'ລູກຄ້າ', 
    description: 'ຈັດການລູກຄ້າ',
    icon: UserCheck, 
    color: 'bg-purple-600 hover:bg-purple-700',
    requiredPermission: 'canViewFinance'
  },
  { 
    id: 'promotions', 
    label: 'ໂປຣໂມຊັນ', 
    description: 'ຈັດການສ່ວນຫຼຸດ',
    icon: Tag, 
    color: 'bg-pink-600 hover:bg-pink-700',
    requiredPermission: 'canViewFinance'
  },
  { 
    id: 'reorder', 
    label: 'ສັ່ງຊື້', 
    description: 'ແຈ້ງເຕືອນສິນຄ້າໝົດ',
    icon: AlertTriangle, 
    color: 'bg-red-600 hover:bg-red-700',
    requiredPermission: 'canManageEmployees'
  },
  { 
    id: 'dashboard', 
    label: 'Dashboard', 
    description: 'ສະຖິຕິລວມ',
    icon: LayoutDashboard, 
    color: 'bg-indigo-600 hover:bg-indigo-700',
    requiredPermission: 'canViewFinance'
  },
  { 
    id: 'attendance', 
    label: 'ເຂົ້າ-ອອກງານ', 
    description: 'ບັນທຶກເວລາ',
    icon: Clock, 
    color: 'bg-cyan-600 hover:bg-cyan-700',
    requiredPermission: 'canViewAttendance'
  },
  { 
    id: 'income', 
    label: 'ລາຍຮັບ', 
    description: 'ບັນທຶກລາຍຮັບ',
    icon: TrendingUp, 
    color: 'bg-emerald-600 hover:bg-emerald-700',
    requiredPermission: 'canViewFinance'
  },
  { 
    id: 'expense', 
    label: 'ລາຍຈ່າຍ', 
    description: 'ບັນທຶກລາຍຈ່າຍ',
    icon: TrendingDown, 
    color: 'bg-orange-600 hover:bg-orange-700',
    requiredPermission: 'canViewFinance'
  },
  { 
    id: 'summary', 
    label: 'ສະຫຼຸບ', 
    description: 'ລາຍງານສະຫຼຸບ',
    icon: BarChart3, 
    color: 'bg-teal-600 hover:bg-teal-700',
    requiredPermission: 'canViewFinance'
  },
  { 
    id: 'users', 
    label: 'ຜູ້ໃຊ້', 
    description: 'ຈັດການຜູ້ໃຊ້',
    icon: Users, 
    color: 'bg-slate-600 hover:bg-slate-700',
    requiredPermission: 'canManageRoles'
  },
  { 
    id: 'settings', 
    label: 'ຕັ້ງຄ່າ', 
    description: 'ຕັ້ງຄ່າລະບົບ',
    icon: Settings, 
    color: 'bg-gray-600 hover:bg-gray-700',
    requiredPermission: 'canViewSettings'
  },
];

export function HomeDashboard({ onNavigate, userRole }: HomeDashboardProps) {
  const permissions = userRole ? ROLE_PERMISSIONS[userRole] : null;

  const visibleModules = modules.filter(module => {
    if (!module.requiredPermission) return true;
    if (!permissions) return false;
    return permissions[module.requiredPermission];
  });

  return (
    <div className="h-[calc(100vh-90px)] flex flex-col">
      {/* Header */}
      <div className="text-center py-4 lg:py-6">
        <h1 className="text-xl lg:text-3xl font-bold text-foreground">ເລືອກໂມດູນ</h1>
        <p className="text-sm text-muted-foreground mt-1">ກົດເລືອກເພື່ອເຂົ້າໃຊ້ງານ</p>
      </div>

      {/* Module Grid */}
      <div className="flex-1 overflow-auto px-2 lg:px-4 pb-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2 lg:gap-3">
          {visibleModules.map((module) => {
            const Icon = module.icon;
            return (
              <button
                key={module.id}
                onClick={() => onNavigate(module.id)}
                className={`${module.color} text-white rounded-xl p-3 lg:p-4 flex flex-col items-center justify-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 min-h-[100px] lg:min-h-[120px]`}
              >
                <Icon className="w-8 h-8 lg:w-10 lg:h-10" />
                <div className="text-center">
                  <p className="font-semibold text-sm lg:text-base">{module.label}</p>
                  <p className="text-xs opacity-80 hidden sm:block">{module.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
