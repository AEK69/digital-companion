import { useState } from 'react';
import { Calendar, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Employee, Leave } from '@/types';

interface LeaveTabProps {
  employees: Employee[];
  leaves: Leave[];
  onAddLeave: (leave: Omit<Leave, 'id'>) => void;
  onDeleteLeave: (id: string) => void;
}

const leaveTypes = [
  { value: 'general', label: 'ລາພັກທົ່ວໄປ' },
  { value: 'vacation', label: 'ພັກຜ່ອນ' },
  { value: 'sick', label: 'ເຈັບປ່ວຍ' },
];

export function LeaveTab({ employees, leaves, onAddLeave, onDeleteLeave }: LeaveTabProps) {
  const [employeeId, setEmployeeId] = useState('');
  const [type, setType] = useState<'general' | 'vacation' | 'sick'>('general');
  const [reason, setReason] = useState('');

  const today = new Date().toISOString().split('T')[0];

  const getEmployeeName = (id: string) => {
    const emp = employees.find((e) => e.id === id);
    return emp?.name || 'ບໍ່ລະບຸ';
  };

  const getLeaveTypeLabel = (typeValue: string) => {
    const leaveType = leaveTypes.find((t) => t.value === typeValue);
    return leaveType?.label || typeValue;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('lo-LA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) return;

    onAddLeave({
      employeeId,
      date: today,
      type,
      reason,
    });

    setEmployeeId('');
    setReason('');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Add Leave Form */}
      <div className="card-luxury rounded-xl p-6">
        <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          ການລາພັກ
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="input-luxury rounded-lg p-3"
            >
              <option value="">-- ເລືອກພະນັກງານ --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>

            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'general' | 'vacation' | 'sick')}
              className="input-luxury rounded-lg p-3"
            >
              {leaveTypes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="ເຫດຜົນ (ບໍ່ບັງຄັບ)"
            className="input-luxury min-h-[80px]"
          />

          <Button type="submit" className="w-full h-12 btn-gold">
            ຢືນຢັນການລາ
          </Button>
        </form>
      </div>

      {/* Leave List */}
      <div className="card-luxury rounded-xl p-6">
        <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          ປະຫວັດການລາ
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 text-muted-foreground font-medium">ວັນທີ</th>
                <th className="text-left py-3 text-muted-foreground font-medium">ຊື່</th>
                <th className="text-left py-3 text-muted-foreground font-medium">ປະເພດ</th>
                <th className="text-right py-3 text-muted-foreground font-medium w-12"></th>
              </tr>
            </thead>
            <tbody>
              {leaves.map((leave) => (
                <tr key={leave.id} className="border-b border-border/50">
                  <td className="py-3 text-muted-foreground">{formatDate(leave.date)}</td>
                  <td className="py-3">{getEmployeeName(leave.employeeId)}</td>
                  <td className="py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        leave.type === 'sick'
                          ? 'bg-destructive/20 text-destructive'
                          : leave.type === 'vacation'
                          ? 'bg-primary/20 text-primary'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {getLeaveTypeLabel(leave.type)}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => onDeleteLeave(leave.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
