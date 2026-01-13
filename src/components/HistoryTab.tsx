import { History, TrendingUp, TrendingDown } from 'lucide-react';
import { Income, Expense, Employee } from '@/types';

interface HistoryTabProps {
  incomes: Income[];
  expenses: Expense[];
  employees: Employee[];
}

export function HistoryTab({ incomes, expenses, employees }: HistoryTabProps) {
  // Combine and sort transactions
  const transactions = [
    ...incomes.map((i) => ({ ...i, isIncome: true as const })),
    ...expenses.map((e) => ({ ...e, isIncome: false as const })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getEmployeeName = (id: string) => {
    const emp = employees.find((e) => e.id === id);
    return emp?.name || 'ບໍ່ລະບຸ';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('lo-LA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="card-luxury rounded-xl p-6">
        <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
          <History className="w-5 h-5" />
          ບັນທຶກທຸລະກຳ
        </h3>

        <div className="space-y-3">
          {transactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">ຍັງບໍ່ມີທຸລະກຳ</p>
          ) : (
            transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      transaction.isIncome
                        ? 'bg-success/20 text-success'
                        : 'bg-destructive/20 text-destructive'
                    }`}
                  >
                    {transaction.isIncome ? (
                      <TrendingUp className="w-5 h-5" />
                    ) : (
                      <TrendingDown className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">
                      {transaction.description || transaction.type}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(transaction.date)} • {getEmployeeName(transaction.employeeId)}
                    </p>
                  </div>
                </div>
                <p
                  className={`font-bold ${
                    transaction.isIncome ? 'text-success' : 'text-destructive'
                  }`}
                >
                  {transaction.isIncome ? '+' : '-'}
                  {transaction.amount.toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
