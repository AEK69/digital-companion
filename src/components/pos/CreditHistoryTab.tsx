import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  CreditCard, 
  Search, 
  Phone, 
  MapPin, 
  Calendar, 
  Banknote,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  Receipt,
  Plus,
  History,
  ChevronDown,
  ChevronRight,
  Merge
} from 'lucide-react';
import { useCreditSales, CreditSale, CreditPayment } from '@/hooks/useCreditSales';
import { format } from 'date-fns';

type FilterPeriod = 'all' | 'day' | 'month' | 'year';
type FilterStatus = 'all' | 'pending' | 'partial' | 'paid';

interface CustomerGroup {
  name: string;
  phone: string | null;
  address: string | null;
  sales: CreditSale[];
  totalAmount: number;
  totalPaid: number;
  totalRemaining: number;
}

export function CreditHistoryTab() {
  const { creditSales, loading, addPayment, getPaymentHistory, getTotalsByStatus } = useCreditSales();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('all');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Expanded customer groups
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set());
  
  // Multi-select for merge payment
  const [selectedBills, setSelectedBills] = useState<Set<string>>(new Set());
  const [mergeMode, setMergeMode] = useState(false);
  
  // Payment dialog
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedCredit, setSelectedCredit] = useState<CreditSale | null>(null);
  const [mergePaymentCustomer, setMergePaymentCustomer] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentNote, setPaymentNote] = useState('');
  const [processing, setProcessing] = useState(false);
  
  // Payment history dialog
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<CreditPayment[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const totals = getTotalsByStatus();

  // Filter credit sales
  const filteredSales = useMemo(() => creditSales.filter(cs => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!cs.customer_name.toLowerCase().includes(query) &&
          !cs.customer_phone?.toLowerCase().includes(query)) {
        return false;
      }
    }
    if (filterStatus !== 'all' && cs.status !== filterStatus) return false;
    if (filterPeriod !== 'all') {
      const csDate = new Date(cs.created_at);
      switch (filterPeriod) {
        case 'day':
          if (csDate.toDateString() !== new Date().toDateString()) return false;
          break;
        case 'month':
          if (csDate.getMonth() + 1 !== selectedMonth || csDate.getFullYear() !== selectedYear) return false;
          break;
        case 'year':
          if (csDate.getFullYear() !== selectedYear) return false;
          break;
      }
    }
    return true;
  }), [creditSales, searchQuery, filterStatus, filterPeriod, selectedMonth, selectedYear]);

  // Group by customer
  const customerGroups = useMemo(() => {
    const groups = new Map<string, CustomerGroup>();
    filteredSales.forEach(cs => {
      const key = cs.customer_name.toLowerCase().trim();
      if (!groups.has(key)) {
        groups.set(key, {
          name: cs.customer_name,
          phone: cs.customer_phone,
          address: cs.customer_address,
          sales: [],
          totalAmount: 0,
          totalPaid: 0,
          totalRemaining: 0,
        });
      }
      const group = groups.get(key)!;
      group.sales.push(cs);
      group.totalAmount += cs.total_amount;
      group.totalPaid += cs.paid_amount;
      group.totalRemaining += cs.remaining_amount;
      // Use latest contact info
      if (cs.customer_phone) group.phone = cs.customer_phone;
      if (cs.customer_address) group.address = cs.customer_address;
    });
    // Sort sales by date within each group
    groups.forEach(g => g.sales.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    return Array.from(groups.values()).sort((a, b) => b.totalRemaining - a.totalRemaining);
  }, [filteredSales]);

  const toggleCustomer = (name: string) => {
    setExpandedCustomers(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleBillSelection = (id: string) => {
    setSelectedBills(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleOpenPayment = (credit: CreditSale) => {
    setSelectedCredit(credit);
    setMergePaymentCustomer(null);
    setPaymentAmount(credit.remaining_amount);
    setPaymentMethod('cash');
    setPaymentNote('');
    setShowPaymentDialog(true);
  };

  // Merge pay: pay multiple bills at once for same customer
  const handleMergePayment = (group: CustomerGroup) => {
    const unpaidBills = group.sales.filter(s => s.status !== 'paid');
    const selectedUnpaid = unpaidBills.filter(s => selectedBills.has(s.id));
    const billsToPay = selectedUnpaid.length > 0 ? selectedUnpaid : unpaidBills;
    
    const totalRemaining = billsToPay.reduce((sum, s) => sum + s.remaining_amount, 0);
    setMergePaymentCustomer(group.name);
    setSelectedCredit(null);
    setPaymentAmount(totalRemaining);
    setPaymentMethod('cash');
    setPaymentNote(`ລວມບິນ: ${billsToPay.length} ລາຍການ`);
    setShowPaymentDialog(true);
  };

  const handleSubmitPayment = async () => {
    if (paymentAmount <= 0) return;
    setProcessing(true);

    if (mergePaymentCustomer) {
      // Merge payment: distribute across bills oldest first
      const customerKey = mergePaymentCustomer.toLowerCase().trim();
      const group = customerGroups.find(g => g.name.toLowerCase().trim() === customerKey);
      if (group) {
        const unpaidBills = group.sales.filter(s => s.status !== 'paid');
        const selectedUnpaid = unpaidBills.filter(s => selectedBills.has(s.id));
        const billsToPay = (selectedUnpaid.length > 0 ? selectedUnpaid : unpaidBills)
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        
        let remaining = paymentAmount;
        for (const bill of billsToPay) {
          if (remaining <= 0) break;
          const payForBill = Math.min(remaining, bill.remaining_amount);
          await addPayment(bill.id, payForBill, paymentMethod, paymentNote || undefined);
          remaining -= payForBill;
        }
      }
    } else if (selectedCredit) {
      await addPayment(selectedCredit.id, paymentAmount, paymentMethod, paymentNote || undefined);
    }

    setShowPaymentDialog(false);
    setSelectedCredit(null);
    setMergePaymentCustomer(null);
    setSelectedBills(new Set());
    setMergeMode(false);
    setProcessing(false);
  };

  const handleViewHistory = async (credit: CreditSale) => {
    setSelectedCredit(credit);
    setHistoryLoading(true);
    setShowHistoryDialog(true);
    const history = await getPaymentHistory(credit.id);
    setPaymentHistory(history);
    setHistoryLoading(false);
  };

  const getStatusBadge = (status: CreditSale['status']) => {
    switch (status) {
      case 'pending': return <Badge variant="destructive" className="text-xs">ຄ້າງຈ່າຍ</Badge>;
      case 'partial': return <Badge variant="secondary" className="text-xs bg-yellow-500/20 text-yellow-700">ບາງສ່ວນ</Badge>;
      case 'paid': return <Badge variant="default" className="text-xs bg-green-500/20 text-green-700">ຈ່າຍແລ້ວ</Badge>;
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const months = [
    { value: 1, label: 'ມັງກອນ' }, { value: 2, label: 'ກຸມພາ' },
    { value: 3, label: 'ມີນາ' }, { value: 4, label: 'ເມສາ' },
    { value: 5, label: 'ພຶດສະພາ' }, { value: 6, label: 'ມິຖຸນາ' },
    { value: 7, label: 'ກໍລະກົດ' }, { value: 8, label: 'ສິງຫາ' },
    { value: 9, label: 'ກັນຍາ' }, { value: 10, label: 'ຕຸລາ' },
    { value: 11, label: 'ພະຈິກ' }, { value: 12, label: 'ທັນວາ' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">ກຳລັງໂຫລດ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col gap-3 p-4 overflow-hidden">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
        <Card className="bg-destructive/10 border-destructive/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">ຄ້າງທັງໝົດ</p>
                <p className="text-lg font-bold text-destructive">₭{totals.totalRemaining.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-yellow-500/10 border-yellow-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-600 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">ບາງສ່ວນ</p>
                <p className="text-lg font-bold text-yellow-600">₭{totals.partial.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-500/10 border-green-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">ຈ່າຍແລ້ວ</p>
                <p className="text-lg font-bold text-green-600">₭{totals.paid.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-primary/10 border-primary/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">ລູກໜີ້</p>
                <p className="text-lg font-bold text-primary">{customerGroups.filter(g => g.totalRemaining > 0).length} ຄົນ</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="shrink-0">
        <CardContent className="p-3">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="ຄົ້ນຫາຊື່ ຫຼື ເບີໂທ..." className="pl-10 h-9" />
            </div>
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
              <SelectTrigger className="w-[130px] h-9"><SelectValue placeholder="ສະຖານະ" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ທັງໝົດ</SelectItem>
                <SelectItem value="pending">ຄ້າງຈ່າຍ</SelectItem>
                <SelectItem value="partial">ບາງສ່ວນ</SelectItem>
                <SelectItem value="paid">ຈ່າຍແລ້ວ</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPeriod} onValueChange={(v) => setFilterPeriod(v as FilterPeriod)}>
              <SelectTrigger className="w-[130px] h-9"><SelectValue placeholder="ໄລຍະ" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ທັງໝົດ</SelectItem>
                <SelectItem value="day">ມື້ນີ້</SelectItem>
                <SelectItem value="month">ເດືອນ</SelectItem>
                <SelectItem value="year">ປີ</SelectItem>
              </SelectContent>
            </Select>
            {filterPeriod === 'month' && (
              <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
                <SelectTrigger className="w-[110px] h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{months.map(m => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}</SelectContent>
              </Select>
            )}
            {(filterPeriod === 'month' || filterPeriod === 'year') && (
              <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                <SelectTrigger className="w-[90px] h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Grouped Credit Sales */}
      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <CardHeader className="py-2 px-4 shrink-0 border-b">
          <CardTitle className="text-sm flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            ລູກໜີ້ ({customerGroups.length} ຄົນ, {filteredSales.length} ບິນ)
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-0 min-h-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-2">
              {customerGroups.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>ບໍ່ມີລາຍການຕິດໜີ້</p>
                </div>
              ) : (
                customerGroups.map(group => {
                  const isExpanded = expandedCustomers.has(group.name);
                  const unpaidCount = group.sales.filter(s => s.status !== 'paid').length;
                  
                  return (
                    <Card key={group.name} className="border overflow-hidden">
                      {/* Customer Header - Click to expand */}
                      <div
                        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => toggleCustomer(group.name)}
                      >
                        {isExpanded ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm truncate">{group.name}</h3>
                            <Badge variant="outline" className="text-[10px] shrink-0">{group.sales.length} ບິນ</Badge>
                            {unpaidCount > 0 && <Badge variant="destructive" className="text-[10px] shrink-0">{unpaidCount} ຄ້າງ</Badge>}
                          </div>
                          <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                            {group.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{group.phone}</span>}
                            {group.address && <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3 shrink-0" />{group.address}</span>}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          {group.totalRemaining > 0 ? (
                            <p className="font-bold text-sm text-destructive">ຄ້າງ ₭{group.totalRemaining.toLocaleString()}</p>
                          ) : (
                            <p className="font-bold text-sm text-green-600">ຈ່າຍຄົບ</p>
                          )}
                          <p className="text-xs text-muted-foreground">ລວມ ₭{group.totalAmount.toLocaleString()}</p>
                        </div>
                        {group.totalRemaining > 0 && (
                          <Button
                            size="sm"
                            className="h-8 text-xs shrink-0"
                            onClick={(e) => { e.stopPropagation(); handleMergePayment(group); }}
                          >
                            <Banknote className="w-3.5 h-3.5 mr-1" />
                            ລວມຈ່າຍ
                          </Button>
                        )}
                      </div>

                      {/* Expanded Bills */}
                      {isExpanded && (
                        <div className="border-t bg-muted/30">
                          <div className="divide-y">
                            {group.sales.map(credit => (
                              <div key={credit.id} className="flex items-center gap-2 px-4 py-2 text-sm">
                                {mergeMode && credit.status !== 'paid' && (
                                  <Checkbox
                                    checked={selectedBills.has(credit.id)}
                                    onCheckedChange={() => toggleBillSelection(credit.id)}
                                  />
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-3 h-3 text-muted-foreground shrink-0" />
                                    <span className="text-xs text-muted-foreground">
                                      {format(new Date(credit.created_at), 'dd/MM/yyyy HH:mm')}
                                    </span>
                                    {getStatusBadge(credit.status)}
                                  </div>
                                  {credit.note && <p className="text-xs text-muted-foreground italic mt-0.5 truncate">"{credit.note}"</p>}
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="font-medium text-xs">₭{credit.total_amount.toLocaleString()}</p>
                                  {credit.status !== 'paid' && credit.remaining_amount !== credit.total_amount && (
                                    <p className="text-[10px] text-destructive">ຄ້າງ ₭{credit.remaining_amount.toLocaleString()}</p>
                                  )}
                                </div>
                                <div className="flex gap-1 shrink-0">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleViewHistory(credit)}>
                                    <History className="w-3.5 h-3.5" />
                                  </Button>
                                  {credit.status !== 'paid' && (
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenPayment(credit)}>
                                      <Plus className="w-3.5 h-3.5" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{mergePaymentCustomer ? 'ລວมບິນຊຳລະ' : 'ຮັບຊຳລະເງິນ'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-secondary rounded-lg">
              <p className="font-bold text-lg">{mergePaymentCustomer || selectedCredit?.customer_name}</p>
              {mergePaymentCustomer && (
                <p className="text-sm text-muted-foreground mt-1">ລວມບິນຈ່າຍພ້ອಮກັນ</p>
              )}
              {selectedCredit && !mergePaymentCustomer && (
                <p className="text-sm text-muted-foreground">
                  ຄ້າງ: <span className="font-bold text-destructive">₭{selectedCredit.remaining_amount.toLocaleString()}</span>
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>ຈຳນວນເງິນ</Label>
              <Input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(Number(e.target.value))} min={0} />
            </div>
            <div className="space-y-2">
              <Label>ວິທີຊຳລະ</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">ເງິນສົດ</SelectItem>
                  <SelectItem value="transfer">ໂອນ</SelectItem>
                  <SelectItem value="qr">QR Code</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>ໝາຍເຫດ</Label>
              <Textarea value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} placeholder="ໝາຍເຫດ..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>ຍົກເລີກ</Button>
            <Button onClick={handleSubmitPayment} disabled={processing || paymentAmount <= 0}>
              {processing ? 'ກຳລັງບັນທຶກ...' : 'ຢືນຢັນ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>ປະຫວັດການຊຳລະ</DialogTitle></DialogHeader>
          {selectedCredit && (
            <div className="space-y-4">
              <div className="p-3 bg-secondary rounded-lg">
                <p className="font-bold">{selectedCredit.customer_name}</p>
                <div className="flex justify-between text-sm mt-1">
                  <span>ຍອດ: ₭{selectedCredit.total_amount.toLocaleString()}</span>
                  <span className="text-green-600">ຈ່າຍແລ້ວ: ₭{selectedCredit.paid_amount.toLocaleString()}</span>
                </div>
              </div>
              <ScrollArea className="max-h-[300px]">
                {historyLoading ? (
                  <div className="text-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div></div>
                ) : paymentHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground"><p>ຍັງບໍ່ມີປະຫວັດ</p></div>
                ) : (
                  <div className="space-y-2">
                    {paymentHistory.map(payment => (
                      <div key={payment.id} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-primary">₭{payment.amount.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">{format(new Date(payment.created_at), 'dd/MM/yyyy HH:mm')}</p>
                            {payment.note && <p className="text-xs mt-1 italic">{payment.note}</p>}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {payment.payment_method === 'cash' ? 'ເງິນສົດ' : payment.payment_method === 'transfer' ? 'ໂອນ' : 'QR'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
