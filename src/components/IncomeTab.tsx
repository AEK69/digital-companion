import { useState } from 'react';
import { TrendingUp, Plus, Trash2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Employee, Income, StoreInfo } from '@/types';
import { generateReceiptPDF } from '@/utils/pdfGenerator';
import { toast } from 'sonner';

interface IncomeTabProps {
  employees: Employee[];
  incomes: Income[];
  onAddIncome: (income: Omit<Income, 'id'>) => void;
  onDeleteIncome: (id: string) => void;
  storeInfo?: StoreInfo;
  canEdit?: boolean;
}

const incomeTypes = [
  { value: 'service', label: 'ການບໍລິການ' },
  { value: 'sale', label: 'ການຂາຍ' },
];

const paymentMethods = ['ເງິນສົດ', 'BCEL One'];

export function IncomeTab({ 
  employees, 
  incomes, 
  onAddIncome, 
  onDeleteIncome, 
  storeInfo = { name: 'KY SKIN' },
  canEdit = true 
}: IncomeTabProps) {
  const [employeeId, setEmployeeId] = useState('');
  const [amount, setAmount] = useState('');
  const [cost, setCost] = useState('');
  const [type, setType] = useState<'service' | 'sale'>('service');
  const [paymentMethod, setPaymentMethod] = useState(paymentMethods[0]);
  const [description, setDescription] = useState('');

  const today = new Date().toISOString().split('T')[0];
  const todayIncomes = incomes.filter((i) => i.date === today);
  const totalIncome = todayIncomes.reduce((sum, i) => sum + i.amount, 0);
  const totalCost = todayIncomes.reduce((sum, i) => sum + i.cost, 0);
  const profit = totalIncome - totalCost;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;

    onAddIncome({
      date: today,
      employeeId,
      amount: parseFloat(amount),
      cost: parseFloat(cost) || 0,
      type,
      paymentMethod,
      description,
    });

    setAmount('');
    setCost('');
    setDescription('');
  };

  const handlePrintReceipt = (income: Income, index: number) => {
    try {
      const employee = employees.find(e => e.id === income.employeeId);
      const receiptNumber = incomes.indexOf(income) + 1;
      const doc = generateReceiptPDF(income, employee, storeInfo, receiptNumber);
      doc.autoPrint();
      window.open(doc.output('bloburl'), '_blank');
      toast.success('ເປີດໜ້າພິມແລ້ວ');
    } catch (error) {
      toast.error('ເກີດຂໍ້ຜິດພາດ');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Add Income Form */}
      {canEdit && (
        <div className="card-luxury rounded-xl p-6">
          <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5" />
            ເພີ່ມລາຍຮັບ
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
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="input-luxury rounded-lg p-3"
              >
                {paymentMethods.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <select
                value={type}
                onChange={(e) => setType(e.target.value as 'service' | 'sale')}
                className="input-luxury rounded-lg p-3"
              >
                {incomeTypes.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>

              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="ຈຳນວນເງິນ"
                className="input-luxury h-12"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                type="number"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="ຕົ້ນທຶນ"
                className="input-luxury h-12"
              />

              <Input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="ລາຍລະອຽດ"
                className="input-luxury h-12"
              />
            </div>

            <Button type="submit" className="w-full h-12 btn-gold">
              ບັນທຶກລາຍຮັບ
            </Button>
          </form>
        </div>
      )}

      {/* Income List */}
      <div className="card-luxury rounded-xl p-6">
        <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          ລາຍການລາຍຮັບ
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 text-muted-foreground font-medium">ລາຍລະອຽດ</th>
                <th className="text-right py-3 text-muted-foreground font-medium">ຈຳນວນ</th>
                <th className="text-right py-3 text-muted-foreground font-medium w-20"></th>
              </tr>
            </thead>
            <tbody>
              {todayIncomes.map((income, index) => (
                <tr key={income.id} className="border-b border-border/50">
                  <td className="py-3">
                    <span className="text-foreground">{income.description || income.type}</span>
                    <span className="text-xs text-muted-foreground ml-2">({income.paymentMethod})</span>
                  </td>
                  <td className="py-3 text-right font-medium text-success">
                    {income.amount.toLocaleString()}
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handlePrintReceipt(income, index)}
                        className="text-primary hover:text-primary/80 transition-colors"
                        title="ພິມໃບເສັດ"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      {canEdit && (
                        <button
                          onClick={() => onDeleteIncome(income.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="mt-4 pt-4 border-t border-border grid grid-cols-3 gap-4">
          <div className="stat-card rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">ລວມຮັບ</p>
            <p className="text-lg font-bold text-success">{totalIncome.toLocaleString()}</p>
          </div>
          <div className="stat-card rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">ຕົ້ນທຶນ</p>
            <p className="text-lg font-bold text-warning">{totalCost.toLocaleString()}</p>
          </div>
          <div className="stat-card rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">ກຳໄລ</p>
            <p className="text-lg font-bold text-primary">{profit.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
