import { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { Employee, Attendance } from '@/types';

interface DailyReportTabProps {
  employees: Employee[];
  attendances: Attendance[];
}

export function DailyReportTab({ employees, attendances }: DailyReportTabProps) {
  const [selectedEmployee, setSelectedEmployee] = useState('');

  const getEmployeeName = (id: string) => {
    const emp = employees.find((e) => e.id === id);
    return emp?.name || 'ບໍ່ລະບຸ';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('lo-LA', {
      month: 'short',
      day: 'numeric',
    });
  };

  const filteredAttendances = selectedEmployee
    ? attendances.filter((a) => a.employeeId === selectedEmployee)
    : attendances;

  const sortedAttendances = [...filteredAttendances].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="card-luxury rounded-xl p-6">
        <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          ກວດສອບລາຍວັນ
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

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 text-muted-foreground font-medium">ວັນ/ທີ</th>
                <th className="text-left py-3 text-muted-foreground font-medium">ເວລາ</th>
                <th className="text-right py-3 text-muted-foreground font-medium">ຊມ</th>
                <th className="text-right py-3 text-muted-foreground font-medium">ຄ່າແຮງ</th>
                <th className="text-right py-3 text-muted-foreground font-medium">ໂບນັດ</th>
                <th className="text-right py-3 text-muted-foreground font-medium">ລວມ</th>
              </tr>
            </thead>
            <tbody>
              {sortedAttendances.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    ບໍ່ມີຂໍ້ມູນ
                  </td>
                </tr>
              ) : (
                sortedAttendances.map((attendance) => (
                  <tr key={attendance.id} className="border-b border-border/50">
                    <td className="py-3">
                      <div className="text-foreground">{formatDate(attendance.date)}</div>
                      {!selectedEmployee && (
                        <div className="text-xs text-muted-foreground">
                          {getEmployeeName(attendance.employeeId)}
                        </div>
                      )}
                    </td>
                    <td className="py-3">
                      <span className="text-success">{attendance.clockIn || '--:--'}</span>
                      <span className="text-muted-foreground mx-1">-</span>
                      <span className="text-destructive">{attendance.clockOut || '--:--'}</span>
                    </td>
                    <td className="py-3 text-right">{attendance.hours.toFixed(1)}</td>
                    <td className="py-3 text-right">{attendance.wage.toLocaleString()}</td>
                    <td className="py-3 text-right text-primary">
                      {attendance.bonus > 0 ? `+${attendance.bonus.toLocaleString()}` : '-'}
                    </td>
                    <td className="py-3 text-right font-bold text-primary">
                      {attendance.total.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
