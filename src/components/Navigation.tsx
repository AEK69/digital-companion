import { 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  History, 
  Calendar, 
  BarChart3, 
  Calculator, 
  Settings,
  FileText,
  Users,
  Download,
  ShoppingCart,
  Package,
  Warehouse,
  Receipt,
  UserCheck,
  AlertTriangle,
  LayoutDashboard
} from 'lucide-react';
import { TabType, AppRole, ROLE_PERMISSIONS } from '@/types';

interface NavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  userRole?: AppRole | null;
}

const allTabs: { id: TabType; label: string; icon: React.ElementType; requiredPermission?: keyof typeof ROLE_PERMISSIONS['admin'] }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, requiredPermission: 'canViewFinance' },
  { id: 'pos', label: 'ຂາຍສິນຄ້າ', icon: ShoppingCart },
  { id: 'products', label: 'ສິນຄ້າ', icon: Package, requiredPermission: 'canManageEmployees' },
  { id: 'inventory', label: 'ສະຕ໊ອກ', icon: Warehouse, requiredPermission: 'canManageEmployees' },
  { id: 'customers', label: 'ລູກຄ້າ', icon: UserCheck, requiredPermission: 'canViewFinance' },
  { id: 'reorder', label: 'ສັ່ງຊື້', icon: AlertTriangle, requiredPermission: 'canManageEmployees' },
  { id: 'salesreport', label: 'ລາຍງານຂາຍ', icon: Receipt, requiredPermission: 'canViewFinance' },
  { id: 'attendance', label: 'ເຂົ້າ-ອອກງານ', icon: Clock, requiredPermission: 'canViewAttendance' },
  { id: 'income', label: 'ລາຍຮັບ', icon: TrendingUp, requiredPermission: 'canViewFinance' },
  { id: 'expense', label: 'ລາຍຈ່າຍ', icon: TrendingDown, requiredPermission: 'canViewFinance' },
  { id: 'history', label: 'ປະຫວັດ', icon: History, requiredPermission: 'canViewFinance' },
  { id: 'leave', label: 'ລາພັກ', icon: Calendar },
  { id: 'daily', label: 'ລາຍວັນ', icon: BarChart3, requiredPermission: 'canViewFinance' },
  { id: 'summary', label: 'ສະຫຼຸບ', icon: Calculator, requiredPermission: 'canViewFinance' },
  { id: 'reports', label: 'ພິມລາຍງານ', icon: FileText, requiredPermission: 'canPrintReports' },
  { id: 'export', label: 'ສົ່ງອອກ', icon: Download, requiredPermission: 'canExportData' },
  { id: 'users', label: 'ຜູ້ໃຊ້', icon: Users, requiredPermission: 'canManageRoles' },
  { id: 'settings', label: 'ຕັ້ງຄ່າ', icon: Settings, requiredPermission: 'canViewSettings' },
];

export function Navigation({ activeTab, onTabChange, userRole }: NavigationProps) {
  const permissions = userRole ? ROLE_PERMISSIONS[userRole] : null;

  const visibleTabs = allTabs.filter(tab => {
    // If no permission required, show to everyone
    if (!tab.requiredPermission) return true;
    // If no role/permissions, hide tabs that require permissions
    if (!permissions) return false;
    // Check if user has required permission
    return permissions[tab.requiredPermission];
  });

  return (
    <nav className="card-luxury border-b border-border sticky top-[88px] z-40 overflow-x-auto">
      <div className="container mx-auto px-2">
        <div className="flex gap-1 py-2 min-w-max">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'tab-active shadow-lg'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
