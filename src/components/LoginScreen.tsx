import { useState } from 'react';
import { Lock, Eye, EyeOff, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface LoginScreenProps {
  onLogin: () => void;
  correctPassword: string;
}

export function LoginScreen({ onLogin, correctPassword }: LoginScreenProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === correctPassword) {
      onLogin();
    } else {
      setError(true);
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className={`card-luxury rounded-2xl p-8 w-full max-w-md animate-fade-in ${isShaking ? 'animate-shake' : ''}`}>
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary to-warning flex items-center justify-center gold-glow">
            <Sparkles className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-primary mb-2">KY SKIN</h1>
          <p className="text-muted-foreground">ລະບົບບໍລິຫານຈັດການທຸລະກິດ</p>
        </div>

        {/* Lock Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
            <Lock className="w-8 h-8 text-primary" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl font-semibold text-center mb-2">ພື້ນທີ່ສ່ວນຕົວ</h2>
        <p className="text-muted-foreground text-center mb-6">ກະລຸນາປ້ອນລະຫັດຜ່ານເພື່ອເຂົ້າເຖິງ</p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="ລະຫັດຜ່ານ"
              className={`input-luxury h-12 pr-12 text-center text-lg tracking-widest ${
                error ? 'border-destructive' : ''
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {error && (
            <p className="text-destructive text-sm text-center animate-fade-in">
              ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ
            </p>
          )}

          <Button type="submit" className="w-full h-12 btn-gold text-lg">
            ປົດລັອກລະບົບ
          </Button>
        </form>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
}
