import { useState } from 'react';
import { Calculator, TrendingUp, TrendingDown, Wallet, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Income, Expense, Attendance } from '@/types';

interface SummaryTabProps {
  incomes: Income[];
  expenses: Expense[];
  attendances: Attendance[];
}

export function SummaryTab({ incomes, expenses, attendances }: SummaryTabProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [calculated, setCalculated] = useState(false);

  const filterByDate = <T extends { date: string }>(items: T[]) => {
    if (!startDate || !endDate) return items;
    return items.filter((item) => item.date >= startDate && item.date <= endDate);
  };

  const filteredIncomes = filterByDate(incomes);
  const filteredExpenses = filterByDate(expenses);
  const filteredAttendances = filterByDate(attendances);

  const totalIncome = filteredIncomes.reduce((sum, i) => sum + i.amount, 0);
  const totalCost = filteredIncomes.reduce((sum, i) => sum + i.cost, 0);
  const totalExpense = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalWage = filteredAttendances.reduce((sum, a) => sum + a.total, 0);
  const grossProfit = totalIncome - totalCost;
  const netProfit = grossProfit - totalExpense - totalWage;

  const handleCalculate = () => {
    setCalculated(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Date Range Selector */}
      <div className="card-luxury rounded-xl p-6">
        <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          ສະຫຼຸບການເງິນ
        </h3>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">ຈາກວັນທີ</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full input-luxury rounded-lg p-3"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">ຮອດວັນທີ</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full input-luxury rounded-lg p-3"
            />
          </div>
        </div>

        <Button onClick={handleCalculate} className="w-full h-12 btn-gold">
          ຄຳນວນຜົນ
        </Button>
      </div>

      {/* Summary Cards */}
      {calculated && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="card-luxury rounded-xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-success" />
                </div>
                <span className="text-muted-foreground">ລາຍຮັບລວມ</span>
              </div>
              <p className="text-2xl font-bold text-success">{totalIncome.toLocaleString()}</p>
            </div>

            <div className="card-luxury rounded-xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-warning" />
                </div>
                <span className="text-muted-foreground">ຕົ້ນທຶນ</span>
              </div>
              <p className="text-2xl font-bold text-warning">{totalCost.toLocaleString()}</p>
            </div>

            <div className="card-luxury rounded-xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-destructive" />
                </div>
                <span className="text-muted-foreground">ລາຍຈ່າຍ</span>
              </div>
              <p className="text-2xl font-bold text-destructive">{totalExpense.toLocaleString()}</p>
            </div>

            <div className="card-luxury rounded-xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-muted-foreground" />
                </div>
                <span className="text-muted-foreground">ຄ່າແຮງລວມ</span>
              </div>
              <p className="text-2xl font-bold">{totalWage.toLocaleString()}</p>
            </div>
          </div>

          {/* Net Profit */}
          <div className="card-luxury rounded-xl p-6 gold-glow">
            <div className="text-center">
              <p className="text-muted-foreground mb-2">ກຳໄລສຸດທິ</p>
              <p
                className={`text-4xl font-bold ${
                  netProfit >= 0 ? 'text-primary' : 'text-destructive'
                }`}
              >
                {netProfit >= 0 ? '+' : ''}
                {netProfit.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Breakdown */}
          <div className="card-luxury rounded-xl p-6">
            <h4 className="font-semibold mb-4">ລາຍລະອຽດ</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">ລາຍຮັບ</span>
                <span className="text-success">+{totalIncome.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ຕົ້ນທຶນສິນຄ້າ</span>
                <span className="text-warning">-{totalCost.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2">
                <span className="text-muted-foreground">ກຳໄລເບື້ອງຕົ້ນ</span>
                <span className="font-medium">{grossProfit.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ລາຍຈ່າຍດຳເນີນງານ</span>
                <span className="text-destructive">-{totalExpense.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ຄ່າແຮງພະນັກງານ</span>
                <span className="text-destructive">-{totalWage.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 font-bold">
                <span>ກຳໄລສຸດທິ</span>
                <span className={netProfit >= 0 ? 'text-primary' : 'text-destructive'}>
                  {netProfit.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
