import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  CalendarDays, 
  Clock, 
  Users, 
  Phone, 
  Mail, 
  Plus,
  Trash2,
  Check,
  X,
  RefreshCw
} from 'lucide-react';
import { useTableReservations, TableReservation, CreateReservationData } from '@/hooks/useTableReservations';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'
];

const STATUS_CONFIG = {
  pending: { label: 'ລໍຖ້າ', color: 'bg-yellow-500/20 text-yellow-500' },
  confirmed: { label: 'ຢືນຢັນແລ້ວ', color: 'bg-primary/20 text-primary' },
  cancelled: { label: 'ຍົກເລີກ', color: 'bg-destructive/20 text-destructive' },
  completed: { label: 'ສຳເລັດ', color: 'bg-green-500/20 text-green-500' },
};

export function TableReservationTab() {
  const { 
    reservations, 
    loading, 
    createReservation, 
    updateReservation, 
    deleteReservation,
    refetch 
  } = useTableReservations();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState<CreateReservationData>({
    customer_name: '',
    phone: '',
    email: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '12:00',
    guests: 2,
    table_number: '',
    notes: '',
  });

  const filteredReservations = reservations.filter(
    r => r.date === format(selectedDate, 'yyyy-MM-dd')
  );

  const handleCreateReservation = async () => {
    if (!formData.customer_name.trim()) return;
    
    await createReservation({
      ...formData,
      date: format(selectedDate, 'yyyy-MM-dd'),
    });
    
    setShowCreateDialog(false);
    setFormData({
      customer_name: '',
      phone: '',
      email: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      time: '12:00',
      guests: 2,
      table_number: '',
      notes: '',
    });
  };

  const handleStatusChange = async (reservation: TableReservation, status: string) => {
    await updateReservation(reservation.id, { status });
  };

  const handleDelete = async (id: string) => {
    if (confirm('ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລົບການຈອງນີ້?')) {
      await deleteReservation(id);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-2 shrink-0">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-primary" />
          ຈອງໂຕະ
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refetch}>
            <RefreshCw className="w-3 h-3 mr-1" />
            ໂຫຼດໃໝ່
          </Button>
          <Button size="sm" onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-3 h-3 mr-1" />
            ຈອງໃໝ່
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-2 p-2 min-h-0 overflow-hidden">
        {/* Calendar */}
        <Card className="lg:col-span-1">
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-sm">ເລືອກວັນທີ</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="rounded-md border w-full"
            />
            
            {/* Today's Summary */}
            <div className="mt-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">ສະຫຼຸບມື້ນີ້</p>
              <div className="grid grid-cols-2 gap-1">
                <div className="p-2 rounded bg-secondary/50 text-center">
                  <p className="text-lg font-bold">{filteredReservations.length}</p>
                  <p className="text-[8px] text-muted-foreground">ການຈອງ</p>
                </div>
                <div className="p-2 rounded bg-secondary/50 text-center">
                  <p className="text-lg font-bold">
                    {filteredReservations.reduce((sum, r) => sum + r.guests, 0)}
                  </p>
                  <p className="text-[8px] text-muted-foreground">ແຂກທັງໝົດ</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reservations List */}
        <Card className="lg:col-span-3 flex flex-col min-h-0 overflow-hidden">
          <CardHeader className="py-2 px-3 shrink-0">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>ການຈອງ - {format(selectedDate, 'dd/MM/yyyy')}</span>
              <Badge variant="secondary">{filteredReservations.length} ລາຍການ</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-2 min-h-0 overflow-hidden">
            <ScrollArea className="h-full">
              {filteredReservations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarDays className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">ບໍ່ມີການຈອງໃນວັນນີ້</p>
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredReservations.map((reservation) => (
                    <Card key={reservation.id} className="p-3 bg-secondary/30">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-sm">{reservation.customer_name}</p>
                          <Badge className={cn('text-[8px]', STATUS_CONFIG[reservation.status].color)}>
                            {STATUS_CONFIG[reservation.status].label}
                          </Badge>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-destructive"
                          onClick={() => handleDelete(reservation.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                      
                      <div className="space-y-1 text-[10px] text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{reservation.time}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <span>{reservation.guests} ຄົນ</span>
                        </div>
                        {reservation.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            <span>{reservation.phone}</span>
                          </div>
                        )}
                        {reservation.table_number && (
                          <div className="flex items-center gap-1">
                            <span className="font-medium">ໂຕະ:</span>
                            <span>{reservation.table_number}</span>
                          </div>
                        )}
                        {reservation.notes && (
                          <p className="text-[9px] italic mt-1 truncate" title={reservation.notes}>
                            {reservation.notes}
                          </p>
                        )}
                      </div>

                      {/* Status Actions */}
                      <div className="flex gap-1 mt-2">
                        {reservation.status === 'pending' && (
                          <>
                            <Button 
                              size="sm" 
                              className="h-6 text-[9px] flex-1"
                              onClick={() => handleStatusChange(reservation, 'confirmed')}
                            >
                              <Check className="w-2.5 h-2.5 mr-0.5" />
                              ຢືນຢັນ
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              className="h-6 text-[9px] flex-1"
                              onClick={() => handleStatusChange(reservation, 'cancelled')}
                            >
                              <X className="w-2.5 h-2.5 mr-0.5" />
                              ຍົກເລີກ
                            </Button>
                          </>
                        )}
                        {reservation.status === 'confirmed' && (
                          <Button 
                            size="sm" 
                            className="h-6 text-[9px] flex-1"
                            onClick={() => handleStatusChange(reservation, 'completed')}
                          >
                            <Check className="w-2.5 h-2.5 mr-0.5" />
                            ສຳເລັດ
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Create Reservation Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" />
              ຈອງໂຕະໃໝ່
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">ຊື່ລູກຄ້າ *</Label>
                <Input
                  value={formData.customer_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                  placeholder="ຊື່ລູກຄ້າ"
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">ເບີໂທ</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="020 XXXX XXXX"
                  className="h-8 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">ເວລາ *</Label>
                <Select 
                  value={formData.time} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, time: value }))}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map(time => (
                      <SelectItem key={time} value={time}>{time}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">ຈຳນວນຄົນ *</Label>
                <Select 
                  value={formData.guests.toString()} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, guests: parseInt(value) }))}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 15, 20].map(num => (
                      <SelectItem key={num} value={num.toString()}>{num} ຄົນ</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">ໂຕະ</Label>
                <Input
                  value={formData.table_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, table_number: e.target.value }))}
                  placeholder="ເລກໂຕະ"
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="email@example.com"
                  className="h-8 text-sm"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">ໝາຍເຫດ</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="ຄຳຂໍພິເສດ, ອາຫານແພ້ ຯລຯ"
                className="h-16 text-sm resize-none"
              />
            </div>

            <div className="bg-secondary/50 p-2 rounded text-sm">
              <p className="font-medium">ວັນທີຈອງ: {format(selectedDate, 'dd/MM/yyyy')}</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              ຍົກເລີກ
            </Button>
            <Button onClick={handleCreateReservation} disabled={!formData.customer_name.trim()}>
              <Plus className="w-4 h-4 mr-1" />
              ຈອງໂຕະ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
