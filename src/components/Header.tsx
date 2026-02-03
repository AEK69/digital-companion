import { Store, LogOut, Crown, Briefcase, User, Home } from 'lucide-react';
import { AppRole } from '@/types';

interface HeaderProps {
  onLogout: () => void;
  userRole?: AppRole | null;
  userName?: string;
  storeName?: string;
  storeLogo?: string;
  onHomeClick?: () => void;
}

export function Header({ onLogout, userRole, userName, storeName = 'AEK SHOP', storeLogo, onHomeClick }: HeaderProps) {
  const getRoleIcon = (role?: AppRole | null) => {
    switch (role) {
      case 'admin':
        return <Crown className="w-4 h-4 text-primary" />;
      case 'finance':
        return <Briefcase className="w-4 h-4 text-success" />;
      default:
        return <User className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getRoleLabel = (role?: AppRole | null) => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'finance':
        return 'Finance';
      default:
        return 'Staff';
    }
  };

  const getRoleBadgeClass = (role?: AppRole | null) => {
    switch (role) {
      case 'admin':
        return 'bg-primary/20 text-primary border-primary/30';
      case 'finance':
        return 'bg-success/20 text-success border-success/30';
      default:
        return 'bg-secondary text-muted-foreground border-border';
    }
  };

  return (
    <header className="card-glass border-b border-border/50 sticky top-0 z-50">
      <div className="container mx-auto px-2 py-2 lg:px-4 lg:py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Home Button */}
            {onHomeClick && (
              <button
                onClick={onHomeClick}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary transition-all border border-primary/30"
              >
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline text-xs font-medium">ໜ້າຫຼັກ</span>
              </button>
            )}

            {/* Logo */}
            <div className="flex items-center gap-2 group">
              <div className="relative">
                <div className="absolute inset-0 rounded-lg bg-primary/20 blur-md group-hover:blur-lg transition-all" />
                {storeLogo ? (
                  <img 
                    src={storeLogo} 
                    alt={storeName}
                    className="relative w-8 h-8 lg:w-10 lg:h-10 rounded-lg object-cover border border-primary/30"
                  />
                ) : (
                  <div className="relative w-8 h-8 lg:w-10 lg:h-10 rounded-lg bg-gradient-to-br from-primary to-success flex items-center justify-center">
                    <Store className="w-4 h-4 lg:w-5 lg:h-5 text-primary-foreground" />
                  </div>
                )}
              </div>
              <div className="hidden sm:block">
                <h1 className="text-base lg:text-lg font-bold bg-gradient-to-r from-primary to-success bg-clip-text text-transparent">
                  {storeName}
                </h1>
                <p className="text-[10px] text-muted-foreground">ລະບົບບໍລິຫານ</p>
              </div>
            </div>
          </div>

          {/* User Info & Logout */}
          <div className="flex items-center gap-2">
            {/* User Role Badge */}
            {userRole && (
              <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs ${getRoleBadgeClass(userRole)}`}>
                {getRoleIcon(userRole)}
                <span className="hidden md:inline font-medium">{userName}</span>
                <span className="text-[10px] opacity-75">({getRoleLabel(userRole)})</span>
              </div>
            )}

            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-2 py-1.5 lg:px-3 lg:py-2 rounded-lg bg-secondary/50 hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all border border-transparent hover:border-destructive/30"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden lg:inline text-xs">ອອກລະບົບ</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}