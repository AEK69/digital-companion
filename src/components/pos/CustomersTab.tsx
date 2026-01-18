import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Gift,
  Phone,
  Mail,
  Star,
  ShoppingBag,
  RefreshCw
} from 'lucide-react';
import { useCustomers, Customer } from '@/hooks/useCustomers';
import { format } from 'date-fns';

export function CustomersTab() {
  const { customers, loading, addCustomer, updateCustomer, deleteCustomer, redeemPoints, refetch } = useCustomers();
  const [searchQuery, setSearchQuery] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [showRedeemDialog, setShowRedeemDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
  });

  const handleOpenDialog = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        name: customer.name,
        phone: customer.phone || '',
        email: customer.email || '',
        address: customer.address || '',
      });
    } else {
      setEditingCustomer(null);
      setFormData({ name: '', phone: '', email: '', address: '' });
    }
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;

    const customerData = {
      name: formData.name.trim(),
      phone: formData.phone.trim() || null,
      email: formData.email.trim() || null,
      address: formData.address.trim() || null,
    };

    if (editingCustomer) {
      await updateCustomer(editingCustomer.id, customerData);
    } else {
      await addCustomer(customerData);
    }

    setShowDialog(false);
    setFormData({ name: '', phone: '', email: '', address: '' });
  };

  const handleDelete = async (id: string) => {
    if (confirm('ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລົບລູກຄ້ານີ້?')) {
      await deleteCustomer(id);
    }
  };

  const handleOpenRedeemDialog = (customer: Customer) => {
    setSelectedCustomer(customer);
    setPointsToRedeem(0);
    setShowRedeemDialog(true);
  };

  const handleRedeem = async () => {
    if (!selectedCustomer || pointsToRedeem <= 0) return;
    await redeemPoints(selectedCustomer.id, pointsToRedeem);
    setShowRedeemDialog(false);
  };

  // Filter customers
  const filteredCustomers = customers.filter(c => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(query) ||
           c.phone?.toLowerCase().includes(query) ||
           c.email?.toLowerCase().includes(query);
  });

  // Stats
  const totalCustomers = customers.length;
  const totalLoyaltyPoints = customers.reduce((sum, c) => sum + c.loyalty_points, 0);
  const totalPurchases = customers.reduce((sum, c) => sum + c.total_purchases, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">ລູກຄ້າທັງໝົດ</p>
                <p className="text-2xl font-bold">{totalCustomers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Star className="w-8 h-8 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">ຄະແນນສະສົມທັງໝົດ</p>
                <p className="text-2xl font-bold">{totalLoyaltyPoints.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">ຍອດຊື້ທັງໝົດ</p>
                <p className="text-2xl font-bold">₭{totalPurchases.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Add */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ຄົ້ນຫາລູກຄ້າ..."
                className="pl-10"
              />
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              ເພີ່ມລູກຄ້າ
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            ລູກຄ້າ ({filteredCustomers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ຊື່</TableHead>
                  <TableHead>ເບີໂທ</TableHead>
                  <TableHead>ອີເມວ</TableHead>
                  <TableHead className="text-right">ຄະແນນ</TableHead>
                  <TableHead className="text-right">ຍອດຊື້</TableHead>
                  <TableHead>ລົງທະບຽນ</TableHead>
                  <TableHead className="text-right">ຈັດການ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map(customer => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>
                      {customer.phone ? (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {customer.phone}
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {customer.email ? (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {customer.email}
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                        <Star className="w-3 h-3 mr-1" />
                        {customer.loyalty_points.toLocaleString()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ₭{customer.total_purchases.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {format(new Date(customer.created_at), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenRedeemDialog(customer)}
                          disabled={customer.loyalty_points <= 0}
                        >
                          <Gift className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(customer)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(customer.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredCustomers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      ບໍ່ພົບລູກຄ້າ
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? 'ແກ້ໄຂລູກຄ້າ' : 'ເພີ່ມລູກຄ້າໃໝ່'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>ຊື່ *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="ຊື່ລູກຄ້າ"
              />
            </div>
            <div className="space-y-2">
              <Label>ເບີໂທ</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="020XXXXXXXX"
              />
            </div>
            <div className="space-y-2">
              <Label>ອີເມວ</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>ທີ່ຢູ່</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="ທີ່ຢູ່"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              ຍົກເລີກ
            </Button>
            <Button onClick={handleSubmit} disabled={!formData.name.trim()}>
              {editingCustomer ? 'ບັນທຶກ' : 'ເພີ່ມ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Redeem Points Dialog */}
      <Dialog open={showRedeemDialog} onOpenChange={setShowRedeemDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ແລກຄະແນນ</DialogTitle>
          </DialogHeader>
          
          {selectedCustomer && (
            <div className="space-y-4">
              <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <p className="text-sm text-muted-foreground">ຄະແນນຄົງເຫຼືອ</p>
                <p className="text-3xl font-bold text-yellow-600">
                  <Star className="w-6 h-6 inline mr-2" />
                  {selectedCustomer.loyalty_points.toLocaleString()}
                </p>
              </div>

              <div className="space-y-2">
                <Label>ຈຳນວນຄະແນນທີ່ຕ້ອງການແລກ</Label>
                <Input
                  type="number"
                  value={pointsToRedeem}
                  onChange={(e) => setPointsToRedeem(Number(e.target.value))}
                  min={0}
                  max={selectedCustomer.loyalty_points}
                />
              </div>

              <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm text-muted-foreground">ສ່ວນຫຼຸດ</p>
                <p className="text-2xl font-bold text-green-600">
                  ₭{(pointsToRedeem * 100).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">(1 ຄະແນນ = ₭100)</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRedeemDialog(false)}>
              ຍົກເລີກ
            </Button>
            <Button 
              onClick={handleRedeem} 
              disabled={pointsToRedeem <= 0 || (selectedCustomer && pointsToRedeem > selectedCustomer.loyalty_points)}
            >
              <Gift className="w-4 h-4 mr-2" />
              ແລກຄະແນນ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
