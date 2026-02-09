import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  TrendingUp,
  Users,
  Receipt,
  Plus,
  History
} from 'lucide-react';
import { useCreditSales, CreditSale, CreditPayment } from '@/hooks/useCreditSales';
import { format } from 'date-fns';

type FilterPeriod = 'all' | 'day' | 'month' | 'year';
type FilterStatus = 'all' | 'pending' | 'partial' | 'paid';

export function CreditHistoryTab() {
  const { creditSales, loading, addPayment, getPaymentHistory, getTotalsByStatus } = useCreditSales();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('all');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Payment dialog
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedCredit, setSelectedCredit] = useState<CreditSale | null>(null);
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
  const filteredSales = creditSales.filter(cs => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!cs.customer_name.toLowerCase().includes(query) &&
          !cs.customer_phone?.toLowerCase().includes(query)) {
        return false;
      }
    }
    
    // Status filter
    if (filterStatus !== 'all' && cs.status !== filterStatus) {
      return false;
    }
    
    // Period filter
    if (filterPeriod !== 'all') {
      const csDate = new Date(cs.created_at);
      const now = new Date();
      
      switch (filterPeriod) {
        case 'day':
          if (csDate.toDateString() !== now.toDateString()) return false;
          break;
        case 'month':
          if (csDate.getMonth() + 1 !== selectedMonth || 
              csDate.getFullYear() !== selectedYear) return false;
          break;
        case 'year':
          if (csDate.getFullYear() !== selectedYear) return false;
          break;
      }
    }
    
    return true;
  });

  const handleOpenPayment = (credit: CreditSale) => {
    setSelectedCredit(credit);
    setPaymentAmount(credit.remaining_amount);
    setPaymentMethod('cash');
    setPaymentNote('');
    setShowPaymentDialog(true);
  };

  const handleSubmitPayment = async () => {
    if (!selectedCredit || paymentAmount <= 0) return;
    
    setProcessing(true);
    const success = await addPayment(
      selectedCredit.id,
      paymentAmount,
      paymentMethod,
      paymentNote || undefined
    );
    
    if (success) {
      setShowPaymentDialog(false);
      setSelectedCredit(null);
    }
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
      case 'pending':
        return <Badge variant="destructive" className="text-xs">ຄ້າງຈ່າຍ</Badge>;
      case 'partial':
        return <Badge variant="secondary" className="text-xs bg-yellow-500/20 text-yellow-700">ຈ່າຍບາງສ່ວນ</Badge>;
      case 'paid':
        return <Badge variant="default" className="text-xs bg-green-500/20 text-green-700">ຈ່າຍແລ້ວ</Badge>;
    }
  };

  // Generate year options
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const months = [
    { value: 1, label: 'ມັງກອນ' },
    { value: 2, label: 'ກຸມພາ' },
    { value: 3, label: 'ມີນາ' },
    { value: 4, label: 'ເມສາ' },
    { value: 5, label: 'ພຶດສະພາ' },
    { value: 6, label: 'ມິຖຸນາ' },
    { value: 7, label: 'ກໍລະກົດ' },
    { value: 8, label: 'ສິງຫາ' },
    { value: 9, label: 'ກັນຍາ' },
    { value: 10, label: 'ຕຸລາ' },
    { value: 11, label: 'ພະຈິກ' },
    { value: 12, label: 'ທັນວາ' },
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
    <div className="h-[calc(100vh-120px)] flex flex-col gap-4 p-4 overflow-hidden">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
        <Card className="bg-destructive/10 border-destructive/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/20">
                <AlertCircle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">ຄ້າງຈ່າຍທັງໝົດ</p>
                <p className="text-lg font-bold text-destructive">₭{totals.totalRemaining.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-yellow-500/10 border-yellow-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/20">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">ຈ່າຍບາງສ່ວນ</p>
                <p className="text-lg font-bold text-yellow-600">₭{totals.partial.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-green-500/10 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">ຈ່າຍແລ້ວ</p>
                <p className="text-lg font-bold text-green-600">₭{totals.paid.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-primary/10 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">ຈຳນວນລູກໜີ້</p>
                <p className="text-lg font-bold text-primary">{creditSales.filter(cs => cs.status !== 'paid').length} ຄົນ</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="shrink-0">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ຄົ້ນຫາຊື່ ຫຼື ເບີໂທ..."
                className="pl-10"
              />
            </div>
            
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="ສະຖານະ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ທັງໝົດ</SelectItem>
                <SelectItem value="pending">ຄ້າງຈ່າຍ</SelectItem>
                <SelectItem value="partial">ຈ່າຍບາງສ່ວນ</SelectItem>
                <SelectItem value="paid">ຈ່າຍແລ້ວ</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterPeriod} onValueChange={(v) => setFilterPeriod(v as FilterPeriod)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="ໄລຍະເວລາ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ທັງໝົດ</SelectItem>
                <SelectItem value="day">ມື້ນີ້</SelectItem>
                <SelectItem value="month">ເດືອນ</SelectItem>
                <SelectItem value="year">ປີ</SelectItem>
              </SelectContent>
            </Select>
            
            {filterPeriod === 'month' && (
              <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map(m => (
                    <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            {(filterPeriod === 'month' || filterPeriod === 'year') && (
              <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(y => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Credit Sales List */}
      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <CardHeader className="py-3 px-4 shrink-0 border-b">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            ລາຍການຕິດໜີ້ ({filteredSales.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-0 min-h-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-3">
              {filteredSales.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>ບໍ່ມີລາຍການຕິດໜີ້</p>
                </div>
              ) : (
                filteredSales.map(credit => (
                  <Card key={credit.id} className="border-2 hover:border-primary/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row md:items-center gap-4">
                        {/* Customer Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-bold text-lg truncate">{credit.customer_name}</h3>
                            {getStatusBadge(credit.status)}
                          </div>
                          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                            {credit.customer_phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {credit.customer_phone}
                              </span>
                            )}
                            {credit.customer_address && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {credit.customer_address}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(credit.created_at), 'dd/MM/yyyy HH:mm')}
                            </span>
                          </div>
                          {credit.note && (
                            <p className="text-sm text-muted-foreground mt-1 italic">"{credit.note}"</p>
                          )}
                        </div>
                        
                        {/* Amount Info */}
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <p className="text-xs text-muted-foreground">ຍອດທັງໝົດ</p>
                          <p className="font-bold text-lg">₭{credit.total_amount.toLocaleString()}</p>
                          {credit.paid_amount > 0 && (
                            <p className="text-xs text-green-600">ຈ່າຍແລ້ວ: ₭{credit.paid_amount.toLocaleString()}</p>
                          )}
                          {credit.status !== 'paid' && (
                            <p className="text-sm font-bold text-destructive">ຄ້າງ: ₭{credit.remaining_amount.toLocaleString()}</p>
                          )}
                        </div>
                        
                        {/* Actions */}
                        <div className="flex gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewHistory(credit)}
                          >
                            <History className="w-4 h-4 mr-1" />
                            ປະຫວັດ
                          </Button>
                          {credit.status !== 'paid' && (
                            <Button
                              size="sm"
                              onClick={() => handleOpenPayment(credit)}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              ຮັບເງິນ
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>ຮັບຊຳລະເງິນ</DialogTitle>
          </DialogHeader>
          
          {selectedCredit && (
            <div className="space-y-4">
              <div className="p-3 bg-secondary rounded-lg">
                <p className="font-bold text-lg">{selectedCredit.customer_name}</p>
                <p className="text-sm text-muted-foreground">
                  ຄ້າງຈ່າຍ: <span className="font-bold text-destructive">₭{selectedCredit.remaining_amount.toLocaleString()}</span>
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>ຈຳນວນເງິນຮັບ</Label>
                <Input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  min={0}
                  max={selectedCredit.remaining_amount}
                />
              </div>
              
              <div className="space-y-2">
                <Label>ວິທີຊຳລະ</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">ເງິນສົດ</SelectItem>
                    <SelectItem value="transfer">ໂອນ</SelectItem>
                    <SelectItem value="qr">QR Code</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>ໝາຍເຫດ</Label>
                <Textarea
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="ໝາຍເຫດ (ຖ້າມີ)..."
                  rows={2}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              ຍົກເລີກ
            </Button>
            <Button onClick={handleSubmitPayment} disabled={processing || paymentAmount <= 0}>
              {processing ? 'ກຳລັງບັນທຶກ...' : 'ຢືນຢັນ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>ປະຫວັດການຊຳລະ</DialogTitle>
          </DialogHeader>
          
          {selectedCredit && (
            <div className="space-y-4">
              <div className="p-3 bg-secondary rounded-lg">
                <p className="font-bold">{selectedCredit.customer_name}</p>
                <div className="flex justify-between text-sm mt-1">
                  <span>ຍອດທັງໝົດ: ₭{selectedCredit.total_amount.toLocaleString()}</span>
                  <span className="text-green-600">ຈ່າຍແລ້ວ: ₭{selectedCredit.paid_amount.toLocaleString()}</span>
                </div>
              </div>
              
              <ScrollArea className="max-h-[300px]">
                {historyLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                  </div>
                ) : paymentHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>ຍັງບໍ່ມີປະຫວັດການຊຳລະ</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {paymentHistory.map(payment => (
                      <div key={payment.id} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-primary">₭{payment.amount.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(payment.created_at), 'dd/MM/yyyy HH:mm')}
                            </p>
                            {payment.note && (
                              <p className="text-xs mt-1 italic">{payment.note}</p>
                            )}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {payment.payment_method === 'cash' ? 'ເງິນສົດ' : 
                             payment.payment_method === 'transfer' ? 'ໂອນ' : 'QR'}
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
