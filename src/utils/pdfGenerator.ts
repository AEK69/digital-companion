import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Income, Expense, Attendance, Employee, StoreInfo } from '@/types';

// Add autotable types
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

// Format number with comma
const formatNumber = (num: number) => num.toLocaleString('en-US');

// Format date to Lao format
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// Generate Receipt PDF
export const generateReceiptPDF = (
  income: Income,
  employee: Employee | undefined,
  storeInfo: StoreInfo,
  receiptNumber: number
) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 150], // Receipt paper size
  });

  const pageWidth = 80;
  let y = 10;

  // Header
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(storeInfo.name, pageWidth / 2, y, { align: 'center' });
  
  y += 6;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  if (storeInfo.address) {
    doc.text(storeInfo.address, pageWidth / 2, y, { align: 'center' });
    y += 4;
  }
  if (storeInfo.phone) {
    doc.text(`Tel: ${storeInfo.phone}`, pageWidth / 2, y, { align: 'center' });
    y += 4;
  }

  // Divider
  y += 2;
  doc.setLineWidth(0.3);
  doc.line(5, y, 75, y);
  y += 6;

  // Receipt info
  doc.setFontSize(10);
  doc.text(`Receipt #${receiptNumber.toString().padStart(6, '0')}`, pageWidth / 2, y, { align: 'center' });
  y += 5;
  doc.setFontSize(8);
  doc.text(`Date: ${formatDate(income.date)}`, 5, y);
  y += 4;
  doc.text(`Staff: ${employee?.name || 'N/A'}`, 5, y);
  y += 4;
  doc.text(`Payment: ${income.paymentMethod}`, 5, y);
  
  // Divider
  y += 4;
  doc.line(5, y, 75, y);
  y += 6;

  // Item details
  doc.setFont('helvetica', 'bold');
  doc.text('Description', 5, y);
  doc.text('Amount', 75, y, { align: 'right' });
  y += 4;
  doc.setFont('helvetica', 'normal');
  
  const typeLabel = income.type === 'service' ? 'Service' : 'Sale';
  doc.text(`${typeLabel}: ${income.description || '-'}`, 5, y);
  y += 4;
  doc.text(formatNumber(income.amount), 75, y, { align: 'right' });

  // Divider
  y += 4;
  doc.line(5, y, 75, y);
  y += 6;

  // Totals
  doc.text('Subtotal:', 5, y);
  doc.text(formatNumber(income.amount), 75, y, { align: 'right' });
  y += 4;
  doc.text('Cost:', 5, y);
  doc.text(`-${formatNumber(income.cost)}`, 75, y, { align: 'right' });
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.text('Net:', 5, y);
  doc.text(formatNumber(income.amount - income.cost), 75, y, { align: 'right' });

  // Footer
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Thank you for your business!', pageWidth / 2, y, { align: 'center' });

  return doc;
};

// Generate Daily Report PDF
export const generateDailyReportPDF = (
  date: string,
  incomes: Income[],
  expenses: Expense[],
  attendances: Attendance[],
  employees: Employee[],
  storeInfo: StoreInfo
) => {
  const doc = new jsPDF();
  let y = 20;

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(storeInfo.name, 105, y, { align: 'center' });
  y += 8;
  doc.setFontSize(14);
  doc.text('Daily Report', 105, y, { align: 'center' });
  y += 6;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(date), 105, y, { align: 'center' });
  y += 15;

  const getEmployeeName = (id: string) => employees.find(e => e.id === id)?.name || '-';

  // Filter by date
  const dayIncomes = incomes.filter(i => i.date === date);
  const dayExpenses = expenses.filter(e => e.date === date);
  const dayAttendances = attendances.filter(a => a.date === date);

  // Summary
  const totalIncome = dayIncomes.reduce((sum, i) => sum + i.amount, 0);
  const totalCost = dayIncomes.reduce((sum, i) => sum + i.cost, 0);
  const totalExpense = dayExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalWage = dayAttendances.reduce((sum, a) => sum + a.total, 0);
  const netProfit = totalIncome - totalCost - totalExpense - totalWage;

  // Summary Box
  doc.setFillColor(245, 245, 245);
  doc.rect(14, y - 5, 182, 35, 'F');
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', 20, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Income: ${formatNumber(totalIncome)} LAK`, 20, y);
  doc.text(`Total Cost: ${formatNumber(totalCost)} LAK`, 110, y);
  y += 6;
  doc.text(`Total Expense: ${formatNumber(totalExpense)} LAK`, 20, y);
  doc.text(`Total Wages: ${formatNumber(totalWage)} LAK`, 110, y);
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text(`Net Profit: ${formatNumber(netProfit)} LAK`, 20, y);
  y += 15;

  // Income Table
  if (dayIncomes.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('Income', 14, y);
    y += 5;
    
    doc.autoTable({
      startY: y,
      head: [['Type', 'Description', 'Staff', 'Payment', 'Amount', 'Cost']],
      body: dayIncomes.map(i => [
        i.type === 'service' ? 'Service' : 'Sale',
        i.description || '-',
        getEmployeeName(i.employeeId),
        i.paymentMethod,
        formatNumber(i.amount),
        formatNumber(i.cost),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [212, 175, 55] },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // Expense Table
  if (dayExpenses.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('Expenses', 14, y);
    y += 5;
    
    doc.autoTable({
      startY: y,
      head: [['Type', 'Description', 'Staff', 'Payment', 'Amount']],
      body: dayExpenses.map(e => [
        e.type,
        e.description || '-',
        getEmployeeName(e.employeeId),
        e.paymentMethod,
        formatNumber(e.amount),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [220, 53, 69] },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // Attendance Table
  if (dayAttendances.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('Attendance', 14, y);
    y += 5;
    
    doc.autoTable({
      startY: y,
      head: [['Staff', 'Clock In', 'Clock Out', 'Hours', 'Wage', 'Bonus', 'Total']],
      body: dayAttendances.map(a => [
        getEmployeeName(a.employeeId),
        a.clockIn || '-',
        a.clockOut || '-',
        a.hours.toFixed(1),
        formatNumber(a.wage),
        formatNumber(a.bonus),
        formatNumber(a.total),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [40, 167, 69] },
    });
  }

  return doc;
};

// Generate Monthly Report PDF
export const generateMonthlyReportPDF = (
  year: number,
  month: number,
  incomes: Income[],
  expenses: Expense[],
  attendances: Attendance[],
  employees: Employee[],
  storeInfo: StoreInfo
) => {
  const doc = new jsPDF();
  let y = 20;

  const monthName = new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(storeInfo.name, 105, y, { align: 'center' });
  y += 8;
  doc.setFontSize(14);
  doc.text('Monthly Report', 105, y, { align: 'center' });
  y += 6;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(monthName, 105, y, { align: 'center' });
  y += 15;

  // Filter by month
  const monthStr = `${year}-${month.toString().padStart(2, '0')}`;
  const monthIncomes = incomes.filter(i => i.date.startsWith(monthStr));
  const monthExpenses = expenses.filter(e => e.date.startsWith(monthStr));
  const monthAttendances = attendances.filter(a => a.date.startsWith(monthStr));

  // Calculations
  const totalIncome = monthIncomes.reduce((sum, i) => sum + i.amount, 0);
  const totalCost = monthIncomes.reduce((sum, i) => sum + i.cost, 0);
  const totalExpense = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalWage = monthAttendances.reduce((sum, a) => sum + a.total, 0);
  const grossProfit = totalIncome - totalCost;
  const netProfit = grossProfit - totalExpense - totalWage;

  // Summary Box
  doc.setFillColor(245, 245, 245);
  doc.rect(14, y - 5, 182, 45, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Financial Summary', 20, y);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Total Income: ${formatNumber(totalIncome)} LAK`, 20, y);
  doc.text(`Total Cost: ${formatNumber(totalCost)} LAK`, 110, y);
  y += 6;
  doc.text(`Gross Profit: ${formatNumber(grossProfit)} LAK`, 20, y);
  doc.text(`Total Expenses: ${formatNumber(totalExpense)} LAK`, 110, y);
  y += 6;
  doc.text(`Total Wages: ${formatNumber(totalWage)} LAK`, 20, y);
  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  const profitColor = netProfit >= 0 ? [40, 167, 69] : [220, 53, 69];
  doc.setTextColor(profitColor[0], profitColor[1], profitColor[2]);
  doc.text(`Net Profit: ${formatNumber(netProfit)} LAK`, 20, y);
  doc.setTextColor(0, 0, 0);
  y += 15;

  // Daily breakdown
  const days = new Map<string, { income: number; expense: number; wage: number }>();
  
  monthIncomes.forEach(i => {
    const current = days.get(i.date) || { income: 0, expense: 0, wage: 0 };
    current.income += i.amount - i.cost;
    days.set(i.date, current);
  });
  
  monthExpenses.forEach(e => {
    const current = days.get(e.date) || { income: 0, expense: 0, wage: 0 };
    current.expense += e.amount;
    days.set(e.date, current);
  });
  
  monthAttendances.forEach(a => {
    const current = days.get(a.date) || { income: 0, expense: 0, wage: 0 };
    current.wage += a.total;
    days.set(a.date, current);
  });

  const sortedDays = Array.from(days.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  if (sortedDays.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Daily Breakdown', 14, y);
    y += 5;

    doc.autoTable({
      startY: y,
      head: [['Date', 'Net Income', 'Expenses', 'Wages', 'Daily Profit']],
      body: sortedDays.map(([date, data]) => [
        formatDate(date),
        formatNumber(data.income),
        formatNumber(data.expense),
        formatNumber(data.wage),
        formatNumber(data.income - data.expense - data.wage),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [212, 175, 55] },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // Employee summary
  const employeeStats = employees.map(emp => {
    const empAttendances = monthAttendances.filter(a => a.employeeId === emp.id);
    const empIncomes = monthIncomes.filter(i => i.employeeId === emp.id);
    return {
      name: emp.name,
      totalHours: empAttendances.reduce((sum, a) => sum + a.hours, 0),
      totalWage: empAttendances.reduce((sum, a) => sum + a.total, 0),
      salesCount: empIncomes.length,
      salesTotal: empIncomes.reduce((sum, i) => sum + i.amount, 0),
    };
  }).filter(e => e.totalHours > 0 || e.salesCount > 0);

  if (employeeStats.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Employee Summary', 14, y);
    y += 5;

    doc.autoTable({
      startY: y,
      head: [['Employee', 'Hours', 'Wages', 'Sales', 'Sales Total']],
      body: employeeStats.map(e => [
        e.name,
        e.totalHours.toFixed(1),
        formatNumber(e.totalWage),
        e.salesCount.toString(),
        formatNumber(e.salesTotal),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [23, 162, 184] },
    });
  }

  return doc;
};
