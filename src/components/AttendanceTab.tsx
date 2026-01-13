import { useState } from 'react';
import { Clock, LogIn, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Employee, Attendance } from '@/types';

interface AttendanceTabProps {
  employees: Employee[];
  attendances: Attendance[];
  onClockIn: (employeeId: string, manualTime?: string) => void;
  onClockOut: (employeeId: string, manualTime?: string) => void;
}

export function AttendanceTab({ employees, attendances, onClockIn, onClockOut }: AttendanceTabProps) {
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [manualEntry, setManualEntry] = useState(false);
  const [manualTime, setManualTime] = useState('');

  const today = new Date().toISOString().split('T')[0];
  const todayAttendance = attendances.find(
    (a) => a.employeeId === selectedEmployee && a.date === today
  );

  const handleClockIn = () => {
    if (!selectedEmployee) return;
    onClockIn(selectedEmployee, manualEntry ? manualTime : undefined);
    setManualTime('');
  };

  const handleClockOut = () => {
    if (!selectedEmployee) return;
    onClockOut(selectedEmployee, manualEntry ? manualTime : undefined);
    setManualTime('');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Employee Selection */}
      <div className="card-luxury rounded-xl p-6">
        <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
          <User className="w-5 h-5" />
          ພະນັກງານ
        </h3>

        <select
          value={selectedEmployee}
          onChange={(e) => setSelectedEmployee(e.target.value)}
          className="w-full input-luxury rounded-lg p-3 mb-4"
        >
          <option value="">-- ເລືອກພະນັກງານ --</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.name}
            </option>
          ))}
        </select>

        {/* Manual Entry Toggle */}
        <div className="flex items-center justify-between p-3 bg-secondary rounded-lg mb-4">
          <span className="text-sm">ປ້ອນຂໍ້ມູນຍ້ອນຫຼັງ?</span>
          <Switch checked={manualEntry} onCheckedChange={setManualEntry} />
        </div>

        {manualEntry && (
          <input
            type="time"
            value={manualTime}
            onChange={(e) => setManualTime(e.target.value)}
            className="w-full input-luxury rounded-lg p-3 mb-4"
          />
        )}

        {/* Clock Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <Button
            onClick={handleClockIn}
            disabled={!selectedEmployee || !!todayAttendance?.clockIn}
            className="h-16 btn-gold text-lg gap-2"
          >
            <LogIn className="w-5 h-5" />
            ເຂົ້າວຽກ
          </Button>
          <Button
            onClick={handleClockOut}
            disabled={!selectedEmployee || !todayAttendance?.clockIn || !!todayAttendance?.clockOut}
            className="h-16 bg-secondary hover:bg-secondary/80 text-foreground text-lg gap-2"
          >
            <LogOut className="w-5 h-5" />
            ອອກວຽກ
          </Button>
        </div>
      </div>

      {/* Today's Status */}
      {selectedEmployee && todayAttendance && (
        <div className="card-luxury rounded-xl p-6">
          <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            ສະຖານະວັນນີ້
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="stat-card rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">ເຂົ້າວຽກ</p>
              <p className="text-xl font-bold text-success">
                {todayAttendance.clockIn || '--:--'}
              </p>
            </div>
            <div className="stat-card rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">ອອກວຽກ</p>
              <p className="text-xl font-bold text-destructive">
                {todayAttendance.clockOut || '--:--'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
