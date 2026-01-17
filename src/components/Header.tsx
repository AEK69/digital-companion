import { Store, LogOut, Crown, Briefcase, User } from 'lucide-react';
import { AppRole } from '@/types';

interface HeaderProps {
  onLogout: () => void;
  userRole?: AppRole | null;
  userName?: string;
  storeName?: string;
  storeLogo?: string;
}

export function Header({ onLogout, userRole, userName, storeName = 'AEK SHOP', storeLogo }: HeaderProps) {
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
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl bg-primary/20 blur-lg group-hover:blur-xl transition-all" />
              {storeLogo ? (
                <img 
                  src={storeLogo} 
                  alt={storeName}
                  className="relative w-11 h-11 rounded-xl object-cover border-2 border-primary/30"
                />
              ) : (
                <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-success flex items-center justify-center">
                  <Store className="w-6 h-6 text-primary-foreground" />
                </div>
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-success bg-clip-text text-transparent">
                {storeName}
              </h1>
              <p className="text-xs text-muted-foreground">ລະບົບບໍລິຫານ</p>
            </div>
          </div>

          {/* User Info & Logout */}
          <div className="flex items-center gap-3">
            {/* User Role Badge */}
            {userRole && (
              <div className={`hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg border ${getRoleBadgeClass(userRole)}`}>
                {getRoleIcon(userRole)}
                <div className="text-sm">
                  {userName && <span className="font-medium">{userName}</span>}
                  <span className="ml-1 text-xs opacity-75">
                    ({getRoleLabel(userRole)})
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-secondary/50 hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all border border-transparent hover:border-destructive/30"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline text-sm">ອອກລະບົບ</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}