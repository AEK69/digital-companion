import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, User, Eye, EyeOff, Store, Loader2, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { z } from 'zod';

const emailSchema = z.string().email('ອີເມວບໍ່ຖືກຕ້ອງ');
const passwordSchema = z.string().min(6, 'ລະຫັດຜ່ານຕ້ອງມີຢ່າງໜ້ອຍ 6 ຕົວອັກສອນ');

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; fullName?: string }>({});

  const { user, signIn, signUp } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const validate = () => {
    const newErrors: typeof errors = {};

    try {
      emailSchema.parse(email);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.email = e.errors[0].message;
      }
    }

    try {
      passwordSchema.parse(password);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.password = e.errors[0].message;
      }
    }

    if (!isLogin && !fullName.trim()) {
      newErrors.fullName = 'ກະລຸນາປ້ອນຊື່ເຕັມ';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast.error('ອີເມວ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ');
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success('ເຂົ້າສູ່ລະບົບສຳເລັດ');
        }
      } else {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          if (error.message.includes('User already registered')) {
            toast.error('ອີເມວນີ້ຖືກໃຊ້ແລ້ວ');
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success('ລົງທະບຽນສຳເລັດ! ກະລຸນາເຂົ້າສູ່ລະບົບ');
          setIsLogin(true);
        }
      }
    } catch (err) {
      toast.error('ເກີດຂໍ້ຜິດພາດ ກະລຸນາລອງໃໝ່');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background shapes */}
      <div className="floating-shape floating-shape-1" />
      <div className="floating-shape floating-shape-2" />
      <div className="floating-shape floating-shape-3" />

      {/* Main card */}
      <div className="glass-card rounded-3xl p-8 sm:p-10 w-full max-w-md relative z-10 animate-scale-in">
        {/* Logo & Title */}
        <div className="text-center mb-8 animate-slide-down">
          <div className="relative w-24 h-24 mx-auto mb-6">
            {/* Animated rings */}
            <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" style={{ animationDuration: '3s' }} />
            <div className="absolute inset-2 rounded-full border-2 border-accent/20 animate-ping" style={{ animationDuration: '4s', animationDelay: '0.5s' }} />
            
            {/* Main icon */}
            <div className="relative w-full h-full rounded-full bg-gradient-to-br from-primary via-primary to-success flex items-center justify-center glow-primary">
              <Store className="w-12 h-12 text-primary-foreground" />
            </div>
          </div>
          
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-success to-accent bg-clip-text text-transparent mb-2">
            AEK SHOP
          </h1>
          <p className="text-muted-foreground">ລະບົບບໍລິຫານຈັດການທຸລະກິດ</p>
        </div>

        {/* Form Title */}
        <div className="text-center mb-6 animate-fade-in stagger-2">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border">
            <Lock className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">
              {isLogin ? 'ເຂົ້າສູ່ລະບົບ' : 'ລົງທະບຽນໃໝ່'}
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="space-y-1 animate-slide-up stagger-1">
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="ຊື່ເຕັມ"
                  className={`input-luxury h-14 pl-12 rounded-xl text-base ${errors.fullName ? 'border-destructive' : ''}`}
                />
              </div>
              {errors.fullName && (
                <p className="text-destructive text-sm flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-destructive" />
                  {errors.fullName}
                </p>
              )}
            </div>
          )}

          <div className="space-y-1 animate-slide-up stagger-2">
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ອີເມວ"
                className={`input-luxury h-14 pl-12 rounded-xl text-base ${errors.email ? 'border-destructive' : ''}`}
              />
            </div>
            {errors.email && (
              <p className="text-destructive text-sm flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-destructive" />
                {errors.email}
              </p>
            )}
          </div>

          <div className="space-y-1 animate-slide-up stagger-3">
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="ລະຫັດຜ່ານ"
                className={`input-luxury h-14 pl-12 pr-14 rounded-xl text-base ${errors.password ? 'border-destructive' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-destructive text-sm flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-destructive" />
                {errors.password}
              </p>
            )}
          </div>

          <Button 
            type="submit" 
            className="w-full h-14 btn-primary text-lg rounded-xl gap-2 animate-slide-up stagger-4 shimmer" 
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                {isLogin ? 'ເຂົ້າສູ່ລະບົບ' : 'ລົງທະບຽນ'}
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </Button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center gap-4 animate-fade-in stagger-4">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <span className="text-xs text-muted-foreground">ຫຼື</span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>

        {/* Toggle */}
        <div className="text-center animate-fade-in stagger-5">
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setErrors({});
            }}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors group"
          >
            <Sparkles className="w-4 h-4 group-hover:animate-bounce-in" />
            {isLogin ? 'ຍັງບໍ່ມີບັນຊີ? ລົງທະບຽນໃໝ່' : 'ມີບັນຊີແລ້ວ? ເຂົ້າສູ່ລະບົບ'}
          </button>
        </div>

        {/* Bottom decoration */}
        <div className="mt-8 pt-6 border-t border-border/50 text-center animate-fade-in stagger-5">
          <p className="text-xs text-muted-foreground">
            © 2025 AEK SHOP. ສະຫງວນລິຂະສິດ.
          </p>
        </div>
      </div>
    </div>
  );
}