import { useState } from 'react';
import { 
  Download, 
  FileSpreadsheet, 
  RefreshCw, 
  Check, 
  AlertCircle,
  Table,
  Users,
  DollarSign,
  Clock,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Employee, Income, Expense, Attendance, Leave } from '@/types';
import { 
  exportToCSV, 
  formatIncomesForExport, 
  formatExpensesForExport,
  formatAttendancesForExport,
  formatLeavesForExport,
  formatEmployeesForExport,
  prepareDataForSync
} from '@/utils/exportUtils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ExportDataTabProps {
  incomes: Income[];
  expenses: Expense[];
  attendances: Attendance[];
  leaves: Leave[];
  employees: Employee[];
}

export function ExportDataTab({
  incomes,
  expenses,
  attendances,
  leaves,
  employees,
}: ExportDataTabProps) {
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleExportCSV = (type: string) => {
    const date = new Date().toISOString().split('T')[0];
    
    switch (type) {
      case 'incomes':
        exportToCSV(formatIncomesForExport(incomes, employees), `incomes-${date}`);
        break;
      case 'expenses':
        exportToCSV(formatExpensesForExport(expenses, employees), `expenses-${date}`);
        break;
      case 'attendances':
        exportToCSV(formatAttendancesForExport(attendances, employees), `attendances-${date}`);
        break;
      case 'leaves':
        exportToCSV(formatLeavesForExport(leaves, employees), `leaves-${date}`);
        break;
      case 'employees':
        exportToCSV(formatEmployeesForExport(employees), `employees-${date}`);
        break;
      case 'all':
        exportToCSV(formatIncomesForExport(incomes, employees), `incomes-${date}`);
        exportToCSV(formatExpensesForExport(expenses, employees), `expenses-${date}`);
        exportToCSV(formatAttendancesForExport(attendances, employees), `attendances-${date}`);
        exportToCSV(formatLeavesForExport(leaves, employees), `leaves-${date}`);
        exportToCSV(formatEmployeesForExport(employees), `employees-${date}`);
        break;
    }
    
    toast.success('ສົ່ງອອກ CSV ສຳເລັດ');
  };

  const handleSyncGoogleSheets = async () => {
    if (!spreadsheetId.trim()) {
      toast.error('ກະລຸນາປ້ອນ Spreadsheet ID');
      return;
    }

    setIsSyncing(true);
    setSyncStatus('idle');

    try {
      const data = prepareDataForSync(incomes, expenses, attendances, leaves, employees);

      const { data: result, error } = await supabase.functions.invoke('sync-google-sheets', {
        body: { spreadsheetId, data },
      });

      if (error) throw error;

      if (result?.success) {
        setSyncStatus('success');
        toast.success('Sync ກັບ Google Sheets ສຳເລັດ!');
      } else {
        throw new Error(result?.error || 'Sync failed');
      }
    } catch (error: any) {
      console.error('Sync error:', error);
      setSyncStatus('error');
      toast.error(`Sync ລົ້ມເຫລວ: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const exportOptions = [
    { id: 'incomes', label: 'ລາຍຮັບ', icon: DollarSign, count: incomes.length, color: 'text-success' },
    { id: 'expenses', label: 'ລາຍຈ່າຍ', icon: DollarSign, count: expenses.length, color: 'text-destructive' },
    { id: 'attendances', label: 'ການລົງເວລາ', icon: Clock, count: attendances.length, color: 'text-primary' },
    { id: 'leaves', label: 'ການລາ', icon: Calendar, count: leaves.length, color: 'text-warning' },
    { id: 'employees', label: 'ພະນັກງານ', icon: Users, count: employees.length, color: 'text-accent' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* CSV Export */}
      <div className="card-luxury rounded-xl p-6">
        <h3 className="text-lg font-semibold text-primary mb-2 flex items-center gap-2">
          <Download className="w-5 h-5" />
          ສົ່ງອອກ CSV
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          ດາວໂຫຼດຂໍ້ມູນເປັນໄຟລ໌ CSV ເພື່ອນຳໄປໃຊ້ໃນ Excel ຫຼື Google Sheets
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          {exportOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => handleExportCSV(option.id)}
              className="flex items-center gap-3 p-4 bg-secondary/50 hover:bg-secondary rounded-xl transition-all group border border-transparent hover:border-primary/30"
            >
              <div className={`w-10 h-10 rounded-lg bg-secondary flex items-center justify-center ${option.color} group-hover:scale-110 transition-transform`}>
                <option.icon className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="font-medium">{option.label}</p>
                <p className="text-xs text-muted-foreground">{option.count} ລາຍການ</p>
              </div>
              <Download className="w-4 h-4 ml-auto text-muted-foreground group-hover:text-primary transition-colors" />
            </button>
          ))}
        </div>

        <Button 
          onClick={() => handleExportCSV('all')} 
          className="w-full btn-primary gap-2"
        >
          <Table className="w-5 h-5" />
          ສົ່ງອອກທັງໝົດ
        </Button>
      </div>

      {/* Google Sheets Sync */}
      <div className="card-luxury rounded-xl p-6">
        <h3 className="text-lg font-semibold text-primary mb-2 flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5" />
          Sync ກັບ Google Sheets
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          ເຊື່ອມຕໍ່ແລະ sync ຂໍ້ມູນໄປຍັງ Google Sheets ອັດຕະໂນມັດ
        </p>

        {/* Instructions */}
        <div className="bg-secondary/30 rounded-lg p-4 mb-6 space-y-2">
          <p className="text-sm font-medium">ຂັ້ນຕອນການຕັ້ງຄ່າ:</p>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>ສ້າງ Google Spreadsheet ໃໝ່</li>
            <li>ສ້າງ 5 sheets ຊື່ວ່າ: <code className="text-primary">incomes</code>, <code className="text-primary">expenses</code>, <code className="text-primary">attendances</code>, <code className="text-primary">leaves</code>, <code className="text-primary">employees</code></li>
            <li>ແຊ Service Account Email ໃຫ້ເຂົ້າເຖິງ Spreadsheet</li>
            <li>ຄັດລອກ Spreadsheet ID ຈາກ URL ມາໃສ່ຂ້າງລຸ່ມ</li>
          </ol>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Spreadsheet ID
            </label>
            <Input
              value={spreadsheetId}
              onChange={(e) => setSpreadsheetId(e.target.value)}
              placeholder="ເຊັ່ນ: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
              className="input-luxury"
            />
            <p className="text-xs text-muted-foreground mt-1">
              ຫາໄດ້ຈາກ URL: https://docs.google.com/spreadsheets/d/<span className="text-primary">[SPREADSHEET_ID]</span>/edit
            </p>
          </div>

          <Button
            onClick={handleSyncGoogleSheets}
            disabled={isSyncing || !spreadsheetId.trim()}
            className="w-full btn-accent gap-2"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                ກຳລັງ Sync...
              </>
            ) : syncStatus === 'success' ? (
              <>
                <Check className="w-5 h-5" />
                Sync ສຳເລັດ!
              </>
            ) : syncStatus === 'error' ? (
              <>
                <AlertCircle className="w-5 h-5" />
                ລອງໃໝ່
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5" />
                Sync ກັບ Google Sheets
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {exportOptions.map((option) => (
          <div key={option.id} className="stat-card rounded-xl p-4 text-center">
            <option.icon className={`w-6 h-6 mx-auto mb-2 ${option.color}`} />
            <p className="text-2xl font-bold">{option.count}</p>
            <p className="text-xs text-muted-foreground">{option.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}