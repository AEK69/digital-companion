import { useState } from 'react';
import { FileText, Printer, Download, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Income, Expense, Attendance, Employee, StoreInfo } from '@/types';
import { generateDailyReportPDF, generateMonthlyReportPDF } from '@/utils/pdfGenerator';
import { toast } from 'sonner';

interface PrintReportsTabProps {
  incomes: Income[];
  expenses: Expense[];
  attendances: Attendance[];
  employees: Employee[];
  storeInfo: StoreInfo;
}

export function PrintReportsTab({ 
  incomes, 
  expenses, 
  attendances, 
  employees, 
  storeInfo 
}: PrintReportsTabProps) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  });

  const handleDailyReport = (action: 'print' | 'download') => {
    try {
      const doc = generateDailyReportPDF(
        selectedDate,
        incomes,
        expenses,
        attendances,
        employees,
        storeInfo
      );

      if (action === 'print') {
        doc.autoPrint();
        window.open(doc.output('bloburl'), '_blank');
      } else {
        doc.save(`daily-report-${selectedDate}.pdf`);
      }
      toast.success(action === 'print' ? 'ເປີດໜ້າພິມແລ້ວ' : 'ດາວໂຫຼດສຳເລັດ');
    } catch (error) {
      toast.error('ເກີດຂໍ້ຜິດພາດ');
    }
  };

  const handleMonthlyReport = (action: 'print' | 'download') => {
    try {
      const [year, month] = selectedMonth.split('-').map(Number);
      const doc = generateMonthlyReportPDF(
        year,
        month,
        incomes,
        expenses,
        attendances,
        employees,
        storeInfo
      );

      if (action === 'print') {
        doc.autoPrint();
        window.open(doc.output('bloburl'), '_blank');
      } else {
        doc.save(`monthly-report-${selectedMonth}.pdf`);
      }
      toast.success(action === 'print' ? 'ເປີດໜ້າພິມແລ້ວ' : 'ດາວໂຫຼດສຳເລັດ');
    } catch (error) {
      toast.error('ເກີດຂໍ້ຜິດພາດ');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Daily Report */}
      <div className="card-luxury rounded-xl p-6">
        <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          ລາຍງານປະຈຳວັນ
        </h3>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">ເລືອກວັນທີ</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full input-luxury rounded-lg p-3 pl-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => handleDailyReport('print')}
              className="btn-gold h-12 flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" />
              ພິມ
            </Button>
            <Button
              onClick={() => handleDailyReport('download')}
              variant="outline"
              className="h-12 flex items-center justify-center gap-2 border-primary text-primary hover:bg-primary/10"
            >
              <Download className="w-4 h-4" />
              ດາວໂຫຼດ PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Monthly Report */}
      <div className="card-luxury rounded-xl p-6">
        <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          ລາຍງານປະຈຳເດືອນ
        </h3>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">ເລືອກເດືອນ</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full input-luxury rounded-lg p-3 pl-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => handleMonthlyReport('print')}
              className="btn-gold h-12 flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" />
              ພິມ
            </Button>
            <Button
              onClick={() => handleMonthlyReport('download')}
              variant="outline"
              className="h-12 flex items-center justify-center gap-2 border-primary text-primary hover:bg-primary/10"
            >
              <Download className="w-4 h-4" />
              ດາວໂຫຼດ PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="bg-secondary/50 rounded-xl p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground mb-2">ໝາຍເຫດ:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>ລາຍງານປະຈຳວັນ - ສະແດງລາຍລະອຽດລາຍຮັບ, ລາຍຈ່າຍ ແລະ ການເຂົ້າວຽກ</li>
          <li>ລາຍງານປະຈຳເດືອນ - ສະແດງສະຫຼຸບການເງິນ ແລະ ສະຖິຕິພະນັກງານ</li>
          <li>ກົດ "ພິມ" ເພື່ອພິມໂດຍກົງ ຫຼື "ດາວໂຫຼດ" ເພື່ອບັນທຶກເປັນ PDF</li>
        </ul>
      </div>
    </div>
  );
}
