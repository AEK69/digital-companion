import { Employee, Income, Expense, Attendance, Leave } from '@/types';

// CSV Export utilities
export function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Handle values that might contain commas or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      }).join(',')
    )
  ].join('\n');

  // Add BOM for Excel UTF-8 compatibility
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${filename}.csv`);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Format data for export
export function formatIncomesForExport(incomes: Income[], employees: Employee[]) {
  return incomes.map(income => {
    const employee = employees.find(e => e.id === income.employeeId);
    return {
      'ວັນທີ': income.date,
      'ພະນັກງານ': employee?.name || 'N/A',
      'ປະເພດ': income.type === 'service' ? 'ບໍລິການ' : 'ຂາຍສິນຄ້າ',
      'ລາຍລະອຽດ': income.description,
      'ຈຳນວນເງິນ': income.amount,
      'ຕົ້ນທຶນ': income.cost,
      'ກຳໄລ': income.amount - income.cost,
      'ວິທີຊຳລະ': income.paymentMethod,
    };
  });
}

export function formatExpensesForExport(expenses: Expense[], employees: Employee[]) {
  return expenses.map(expense => {
    const employee = employees.find(e => e.id === expense.employeeId);
    return {
      'ວັນທີ': expense.date,
      'ພະນັກງານ': employee?.name || 'N/A',
      'ປະເພດ': expense.type,
      'ລາຍລະອຽດ': expense.description,
      'ຈຳນວນເງິນ': expense.amount,
      'ວິທີຊຳລະ': expense.paymentMethod,
    };
  });
}

export function formatAttendancesForExport(attendances: Attendance[], employees: Employee[]) {
  return attendances.map(att => {
    const employee = employees.find(e => e.id === att.employeeId);
    return {
      'ວັນທີ': att.date,
      'ພະນັກງານ': employee?.name || 'N/A',
      'ເຂົ້າວຽກ': att.clockIn || '-',
      'ອອກວຽກ': att.clockOut || '-',
      'ຊົ່ວໂມງ': att.hours.toFixed(2),
      'ຄ່າແຮງ': att.wage,
      'ໂບນັດ': att.bonus,
      'ລວມ': att.total,
    };
  });
}

export function formatLeavesForExport(leaves: Leave[], employees: Employee[]) {
  const leaveTypeMap: Record<string, string> = {
    general: 'ລາທົ່ວໄປ',
    vacation: 'ລາພັກຜ່ອນ',
    sick: 'ລາປ່ວຍ',
  };

  return leaves.map(leave => {
    const employee = employees.find(e => e.id === leave.employeeId);
    return {
      'ວັນທີ': leave.date,
      'ພະນັກງານ': employee?.name || 'N/A',
      'ປະເພດການລາ': leaveTypeMap[leave.type] || leave.type,
      'ເຫດຜົນ': leave.reason || '-',
    };
  });
}

export function formatEmployeesForExport(employees: Employee[]) {
  return employees.map(emp => ({
    'ຊື່': emp.name,
    'ຄ່າແຮງ/ຊົ່ວໂມງ': emp.hourlyRate,
  }));
}

// Prepare all data for Google Sheets sync
export function prepareDataForSync(
  incomes: Income[],
  expenses: Expense[],
  attendances: Attendance[],
  leaves: Leave[],
  employees: Employee[]
) {
  return {
    incomes: incomes.map(i => ({
      ...i,
      employeeName: employees.find(e => e.id === i.employeeId)?.name || 'N/A',
    })),
    expenses: expenses.map(e => ({
      ...e,
      employeeName: employees.find(emp => emp.id === e.employeeId)?.name || 'N/A',
    })),
    attendances: attendances.map(a => ({
      ...a,
      employeeName: employees.find(e => e.id === a.employeeId)?.name || 'N/A',
    })),
    leaves: leaves.map(l => ({
      ...l,
      employeeName: employees.find(e => e.id === l.employeeId)?.name || 'N/A',
    })),
    employees,
  };
}