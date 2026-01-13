import { useState } from 'react';
import { TrendingDown, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Employee, Expense } from '@/types';

interface ExpenseTabProps {
  employees: Employee[];
  expenses: Expense[];
  onAddExpense: (expense: Omit<Expense, 'id'>) => void;
  onDeleteExpense: (id: string) => void;
}

const expenseTypes = ['ຄ່າເຊົ່າ', 'ຄ່າໄຟຟ້າ', 'ຊື້ເຄື່ອງເຂົ້າ', 'ອື່ນໆ'];
const paymentMethods = ['ເງິນສົດ', 'BCEL One'];

export function ExpenseTab({ employees, expenses, onAddExpense, onDeleteExpense }: ExpenseTabProps) {
  const [employeeId, setEmployeeId] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState(expenseTypes[0]);
  const [paymentMethod, setPaymentMethod] = useState(paymentMethods[0]);
  const [description, setDescription] = useState('');

  const today = new Date().toISOString().split('T')[0];
  const todayExpenses = expenses.filter((e) => e.date === today);
  const totalExpense = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;

    onAddExpense({
      date: today,
      employeeId,
      amount: parseFloat(amount),
      type,
      paymentMethod,
      description,
    });

    setAmount('');
    setDescription('');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Add Expense Form */}
      <div className="card-luxury rounded-xl p-6">
        <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          ເພີ່ມລາຍຈ່າຍ
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
              onChange={(e) => setType(e.target.value)}
              className="input-luxury rounded-lg p-3"
            >
              {expenseTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
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

          <Input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="ລາຍລະອຽດ"
            className="input-luxury h-12"
          />

          <Button type="submit" className="w-full h-12 btn-gold">
            ບັນທຶກລາຍຈ່າຍ
          </Button>
        </form>
      </div>

      {/* Expense List */}
      <div className="card-luxury rounded-xl p-6">
        <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
          <TrendingDown className="w-5 h-5" />
          ລາຍການລາຍຈ່າຍ
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 text-muted-foreground font-medium">ລາຍລະອຽດ</th>
                <th className="text-right py-3 text-muted-foreground font-medium">ຈຳນວນ</th>
                <th className="text-right py-3 text-muted-foreground font-medium w-12"></th>
              </tr>
            </thead>
            <tbody>
              {todayExpenses.map((expense) => (
                <tr key={expense.id} className="border-b border-border/50">
                  <td className="py-3">
                    <span className="text-foreground">{expense.description || expense.type}</span>
                    <span className="text-xs text-muted-foreground ml-2">({expense.paymentMethod})</span>
                  </td>
                  <td className="py-3 text-right font-medium text-destructive">
                    -{expense.amount.toLocaleString()}
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => onDeleteExpense(expense.id)}
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

        {/* Summary */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="stat-card rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">ລວມຈ່າຍ</p>
            <p className="text-2xl font-bold text-destructive">{totalExpense.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
