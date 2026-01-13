import { Sparkles, LogOut, Clock, Crown, Briefcase, User } from 'lucide-react';
import { useState, useEffect } from 'react';
import { AppRole } from '@/types';

interface HeaderProps {
  onLogout: () => void;
  userRole?: AppRole | null;
  userName?: string;
}

export function Header({ onLogout, userRole, userName }: HeaderProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

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

  return (
    <header className="card-luxury border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-warning flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary">KY SKIN</h1>
              <p className="text-xs text-muted-foreground">ລະບົບບໍລິຫານ</p>
            </div>
          </div>

          {/* Time Display */}
          <div className="time-display px-6 py-3 rounded-xl text-center hidden sm:block">
            <div className="text-2xl font-bold text-primary font-mono">{formatTime(time)}</div>
            <div className="text-xs text-muted-foreground">{formatDate(time)}</div>
          </div>

          {/* Mobile Time */}
          <div className="sm:hidden flex items-center gap-2 text-primary">
            <Clock className="w-4 h-4" />
            <span className="font-mono font-bold">{formatTime(time)}</span>
          </div>

          {/* User Info & Logout */}
          <div className="flex items-center gap-3">
            {/* User Role Badge */}
            {userRole && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-lg">
                {getRoleIcon(userRole)}
                <div className="text-sm">
                  {userName && <span className="font-medium text-foreground">{userName}</span>}
                  <span className={`ml-1 text-xs ${userRole === 'admin' ? 'text-primary' : userRole === 'finance' ? 'text-success' : 'text-muted-foreground'}`}>
                    ({getRoleLabel(userRole)})
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">ອອກລະບົບ</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
