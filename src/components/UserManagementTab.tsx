import { useState, useEffect } from 'react';
import { Users, Shield, Crown, Briefcase, User, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AppRole } from '@/types';

interface UserWithRole {
  user_id: string;
  full_name: string;
  email: string;
  role: AppRole;
}

export function UserManagementTab() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Get profiles with roles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name');

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Combine data - note: we can't access auth.users directly
      const userList: UserWithRole[] = (profiles || []).map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.user_id);
        return {
          user_id: profile.user_id,
          full_name: profile.full_name,
          email: '', // Can't access email from profiles
          role: (userRole?.role as AppRole) || 'staff',
        };
      });

      setUsers(userList);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('ເກີດຂໍ້ຜິດພາດໃນການໂຫຼດຂໍ້ມູນ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUpdateRole = async (userId: string, newRole: AppRole) => {
    setUpdating(userId);
    try {
      // Update role in database
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) throw error;

      // Update local state
      setUsers(prev => 
        prev.map(u => u.user_id === userId ? { ...u, role: newRole } : u)
      );
      
      toast.success('ອັບເດດສິດທິ່ສຳເລັດ');
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('ເກີດຂໍ້ຜິດພາດ');
    } finally {
      setUpdating(null);
    }
  };

  const getRoleIcon = (role: AppRole) => {
    switch (role) {
      case 'admin':
        return <Crown className="w-4 h-4 text-primary" />;
      case 'finance':
        return <Briefcase className="w-4 h-4 text-success" />;
      default:
        return <User className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getRoleLabel = (role: AppRole) => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'finance':
        return 'Finance';
      default:
        return 'Staff';
    }
  };

  const getRoleBadgeClass = (role: AppRole) => {
    switch (role) {
      case 'admin':
        return 'bg-primary/20 text-primary border-primary/30';
      case 'finance':
        return 'bg-success/20 text-success border-success/30';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="card-luxury rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
            <Shield className="w-5 h-5" />
            ຈັດການສິດທິ່ຜູ້ໃຊ້
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchUsers}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            ໂຫຼດໃໝ່
          </Button>
        </div>

        {/* Role Legend */}
        <div className="flex flex-wrap gap-4 mb-6 p-4 bg-secondary/30 rounded-lg">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-primary" />
            <span className="text-sm"><strong>Admin</strong> - ເຂົ້າເຖິງທຸກຢ່າງ</span>
          </div>
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-success" />
            <span className="text-sm"><strong>Finance</strong> - ເບິ່ງ/ແກ້ໄຂການເງິນ</span>
          </div>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm"><strong>Staff</strong> - ລົງເວລາເທົ່ານັ້ນ</span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>ບໍ່ມີຜູ້ໃຊ້ໃນລະບົບ</p>
          </div>
        ) : (
          <div className="space-y-3">
            {users.map((user) => (
              <div
                key={user.user_id}
                className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    {getRoleIcon(user.role)}
                  </div>
                  <div>
                    <p className="font-medium">{user.full_name}</p>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${getRoleBadgeClass(user.role)}`}>
                      {getRoleIcon(user.role)}
                      {getRoleLabel(user.role)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {updating === user.user_id ? (
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  ) : (
                    <select
                      value={user.role}
                      onChange={(e) => handleUpdateRole(user.user_id, e.target.value as AppRole)}
                      className="input-luxury rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="staff">Staff</option>
                      <option value="finance">Finance</option>
                      <option value="admin">Admin</option>
                    </select>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
