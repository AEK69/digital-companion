import { 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  History, 
  Calendar, 
  BarChart3, 
  Calculator, 
  Settings 
} from 'lucide-react';
import { TabType } from '@/types';

interface NavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
  { id: 'attendance', label: 'ເຂົ້າ-ອອກງານ', icon: Clock },
  { id: 'income', label: 'ລາຍຮັບ', icon: TrendingUp },
  { id: 'expense', label: 'ລາຍຈ່າຍ', icon: TrendingDown },
  { id: 'history', label: 'ປະຫວັດ', icon: History },
  { id: 'leave', label: 'ລາພັກ', icon: Calendar },
  { id: 'daily', label: 'ລາຍວັນ', icon: BarChart3 },
  { id: 'summary', label: 'ສະຫຼຸບ', icon: Calculator },
  { id: 'settings', label: 'ຕັ້ງຄ່າ', icon: Settings },
];

export function Navigation({ activeTab, onTabChange }: NavigationProps) {
  return (
    <nav className="card-luxury border-b border-border sticky top-[88px] z-40 overflow-x-auto">
      <div className="container mx-auto px-2">
        <div className="flex gap-1 py-2 min-w-max">
          {tabs.map((tab) => {
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
