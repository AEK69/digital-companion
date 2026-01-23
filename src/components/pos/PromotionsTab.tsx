import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Gift,
  Ticket,
  Percent,
  Tag
} from 'lucide-react';
import { usePromotions, Promotion, Coupon } from '@/hooks/usePromotions';
import { format } from 'date-fns';

type PromoType = 'percentage' | 'fixed' | 'buy_x_get_y';
type CouponType = 'percentage' | 'fixed';

interface PromotionFormData {
  name: string;
  description: string;
  type: PromoType;
  value: number;
  min_purchase_amount: number;
  buy_quantity: number;
  get_quantity: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

interface CouponFormData {
  code: string;
  name: string;
  description: string;
  type: CouponType;
  value: number;
  min_purchase_amount: number;
  max_discount_amount: number;
  usage_limit: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

const initialPromoForm: PromotionFormData = {
  name: '',
  description: '',
  type: 'percentage',
  value: 10,
  min_purchase_amount: 0,
  buy_quantity: 2,
  get_quantity: 1,
  start_date: new Date().toISOString().split('T')[0],
  end_date: '',
  is_active: true,
};

const initialCouponForm: CouponFormData = {
  code: '',
  name: '',
  description: '',
  type: 'percentage',
  value: 10,
  min_purchase_amount: 0,
  max_discount_amount: 0,
  usage_limit: 0,
  start_date: new Date().toISOString().split('T')[0],
  end_date: '',
  is_active: true,
};

export function PromotionsTab() {
  const { 
    promotions, 
    coupons, 
    loading,
    addPromotion,
    updatePromotion,
    deletePromotion,
    addCoupon,
    updateCoupon,
    deleteCoupon,
  } = usePromotions();
  
  const [showPromoDialog, setShowPromoDialog] = useState(false);
  const [showCouponDialog, setShowCouponDialog] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [promoForm, setPromoForm] = useState<PromotionFormData>(initialPromoForm);
  const [couponForm, setCouponForm] = useState<CouponFormData>(initialCouponForm);
  const [processing, setProcessing] = useState(false);

  const handleSubmitPromo = async () => {
    if (!promoForm.name.trim()) return;
    
    setProcessing(true);
    try {
      const data = {
        name: promoForm.name,
        description: promoForm.description || null,
        type: promoForm.type,
        value: promoForm.value,
        min_purchase_amount: promoForm.min_purchase_amount,
        buy_quantity: promoForm.buy_quantity,
        get_quantity: promoForm.get_quantity,
        applicable_products: [],
        applicable_categories: [],
        start_date: new Date(promoForm.start_date).toISOString(),
        end_date: promoForm.end_date ? new Date(promoForm.end_date).toISOString() : null,
        is_active: promoForm.is_active,
      };

      if (editingPromo) {
        await updatePromotion(editingPromo.id, data);
      } else {
        await addPromotion(data);
      }
      
      setShowPromoDialog(false);
      setEditingPromo(null);
      setPromoForm(initialPromoForm);
    } finally {
      setProcessing(false);
    }
  };

  const handleSubmitCoupon = async () => {
    if (!couponForm.code.trim() || !couponForm.name.trim()) return;
    
    setProcessing(true);
    try {
      const data = {
        code: couponForm.code.toUpperCase(),
        name: couponForm.name,
        description: couponForm.description || null,
        type: couponForm.type,
        value: couponForm.value,
        min_purchase_amount: couponForm.min_purchase_amount,
        max_discount_amount: couponForm.max_discount_amount || null,
        usage_limit: couponForm.usage_limit || null,
        start_date: new Date(couponForm.start_date).toISOString(),
        end_date: couponForm.end_date ? new Date(couponForm.end_date).toISOString() : null,
        is_active: couponForm.is_active,
      };

      if (editingCoupon) {
        await updateCoupon(editingCoupon.id, data);
      } else {
        await addCoupon(data);
      }
      
      setShowCouponDialog(false);
      setEditingCoupon(null);
      setCouponForm(initialCouponForm);
    } finally {
      setProcessing(false);
    }
  };

  const handleEditPromo = (promo: Promotion) => {
    setEditingPromo(promo);
    setPromoForm({
      name: promo.name,
      description: promo.description || '',
      type: promo.type,
      value: promo.value,
      min_purchase_amount: promo.min_purchase_amount,
      buy_quantity: promo.buy_quantity,
      get_quantity: promo.get_quantity,
      start_date: promo.start_date.split('T')[0],
      end_date: promo.end_date?.split('T')[0] || '',
      is_active: promo.is_active,
    });
    setShowPromoDialog(true);
  };

  const handleEditCoupon = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setCouponForm({
      code: coupon.code,
      name: coupon.name,
      description: coupon.description || '',
      type: coupon.type,
      value: coupon.value,
      min_purchase_amount: coupon.min_purchase_amount,
      max_discount_amount: coupon.max_discount_amount || 0,
      usage_limit: coupon.usage_limit || 0,
      start_date: coupon.start_date.split('T')[0],
      end_date: coupon.end_date?.split('T')[0] || '',
      is_active: coupon.is_active,
    });
    setShowCouponDialog(true);
  };

  const handleDeletePromo = async (promo: Promotion) => {
    if (confirm(`ຕ້ອງການລຶບ "${promo.name}" ແທ້ຫຼືບໍ່?`)) {
      await deletePromotion(promo.id);
    }
  };

  const handleDeleteCoupon = async (coupon: Coupon) => {
    if (confirm(`ຕ້ອງການລຶບ "${coupon.name}" ແທ້ຫຼືບໍ່?`)) {
      await deleteCoupon(coupon.id);
    }
  };

  const getPromoTypeLabel = (type: PromoType) => {
    switch (type) {
      case 'percentage': return 'ສ່ວນຫຼຸດ %';
      case 'fixed': return 'ສ່ວນຫຼຸດຄົງທີ່';
      case 'buy_x_get_y': return 'ຊື້ X ແຖມ Y';
    }
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="promotions">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="promotions" className="flex items-center gap-2">
            <Gift className="w-4 h-4" />
            <span className="hidden sm:inline">ໂປຣໂມຊັນ</span>
          </TabsTrigger>
          <TabsTrigger value="coupons" className="flex items-center gap-2">
            <Ticket className="w-4 h-4" />
            <span className="hidden sm:inline">ຄູປອງ</span>
          </TabsTrigger>
        </TabsList>

        {/* Promotions Tab */}
        <TabsContent value="promotions" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Gift className="w-5 h-5" />
                ໂປຣໂມຊັນ ({promotions.length})
              </CardTitle>
              <Button onClick={() => { setEditingPromo(null); setPromoForm(initialPromoForm); setShowPromoDialog(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                ເພີ່ມໂປຣໂມຊັນ
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ຊື່</TableHead>
                      <TableHead>ປະເພດ</TableHead>
                      <TableHead className="text-right">ມູນຄ່າ</TableHead>
                      <TableHead>ວັນທີ</TableHead>
                      <TableHead>ສະຖານະ</TableHead>
                      <TableHead className="text-right">ຈັດການ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {promotions.map(promo => (
                      <TableRow key={promo.id}>
                        <TableCell className="font-medium">{promo.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{getPromoTypeLabel(promo.type)}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {promo.type === 'percentage' ? `${promo.value}%` : 
                           promo.type === 'fixed' ? `₭${promo.value.toLocaleString()}` :
                           `ຊື້ ${promo.buy_quantity} ແຖມ ${promo.get_quantity}`}
                        </TableCell>
                        <TableCell className="text-xs">
                          {format(new Date(promo.start_date), 'dd/MM/yyyy')}
                          {promo.end_date && ` - ${format(new Date(promo.end_date), 'dd/MM/yyyy')}`}
                        </TableCell>
                        <TableCell>
                          <Badge variant={promo.is_active ? 'default' : 'secondary'}>
                            {promo.is_active ? 'ເປີດໃຊ້' : 'ປິດ'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEditPromo(promo)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeletePromo(promo)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {promotions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          ຍັງບໍ່ມີໂປຣໂມຊັນ
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Coupons Tab */}
        <TabsContent value="coupons" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Ticket className="w-5 h-5" />
                ຄູປອງ ({coupons.length})
              </CardTitle>
              <Button onClick={() => { setEditingCoupon(null); setCouponForm(initialCouponForm); setShowCouponDialog(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                ເພີ່ມຄູປອງ
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ລະຫັດ</TableHead>
                      <TableHead>ຊື່</TableHead>
                      <TableHead>ປະເພດ</TableHead>
                      <TableHead className="text-right">ມູນຄ່າ</TableHead>
                      <TableHead className="text-right">ໃຊ້ແລ້ວ</TableHead>
                      <TableHead>ສະຖານະ</TableHead>
                      <TableHead className="text-right">ຈັດການ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {coupons.map(coupon => (
                      <TableRow key={coupon.id}>
                        <TableCell className="font-mono font-bold">{coupon.code}</TableCell>
                        <TableCell>{coupon.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {coupon.type === 'percentage' ? 'ສ່ວນ %' : 'ຄົງທີ່'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {coupon.type === 'percentage' ? `${coupon.value}%` : `₭${coupon.value.toLocaleString()}`}
                        </TableCell>
                        <TableCell className="text-right">
                          {coupon.used_count}{coupon.usage_limit ? `/${coupon.usage_limit}` : ''}
                        </TableCell>
                        <TableCell>
                          <Badge variant={coupon.is_active ? 'default' : 'secondary'}>
                            {coupon.is_active ? 'ເປີດໃຊ້' : 'ປິດ'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEditCoupon(coupon)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteCoupon(coupon)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {coupons.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          ຍັງບໍ່ມີຄູປອງ
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Promotion Dialog */}
      <Dialog open={showPromoDialog} onOpenChange={setShowPromoDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPromo ? 'ແກ້ໄຂໂປຣໂມຊັນ' : 'ເພີ່ມໂປຣໂມຊັນ'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>ຊື່ໂປຣໂມຊັນ *</Label>
              <Input
                value={promoForm.name}
                onChange={(e) => setPromoForm({ ...promoForm, name: e.target.value })}
                placeholder="ເຊັ່ນ: ຫຼຸດ 10% ຕ້ອນຮັບປີໃໝ່"
              />
            </div>

            <div className="space-y-2">
              <Label>ລາຍລະອຽດ</Label>
              <Textarea
                value={promoForm.description}
                onChange={(e) => setPromoForm({ ...promoForm, description: e.target.value })}
                placeholder="ລາຍລະອຽດເພີ່ມເຕີມ..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>ປະເພດໂປຣໂມຊັນ</Label>
              <Select 
                value={promoForm.type} 
                onValueChange={(value: PromoType) => setPromoForm({ ...promoForm, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">
                    <div className="flex items-center gap-2">
                      <Percent className="w-4 h-4" />
                      ສ່ວນຫຼຸດ % (ເຊັ່ນ ຫຼຸດ 10%)
                    </div>
                  </SelectItem>
                  <SelectItem value="fixed">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      ສ່ວນຫຼຸດຄົງທີ່ (ເຊັ່ນ ຫຼຸດ 50,000₭)
                    </div>
                  </SelectItem>
                  <SelectItem value="buy_x_get_y">
                    <div className="flex items-center gap-2">
                      <Gift className="w-4 h-4" />
                      ຊື້ X ແຖມ Y (ເຊັ່ນ ຊື້ 2 ແຖມ 1)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {promoForm.type === 'percentage' && (
              <div className="space-y-2">
                <Label>ເປີເຊັນຫຼຸດ (%)</Label>
                <Input
                  type="number"
                  value={promoForm.value}
                  onChange={(e) => setPromoForm({ ...promoForm, value: Number(e.target.value) })}
                  min={1}
                  max={100}
                />
              </div>
            )}

            {promoForm.type === 'fixed' && (
              <div className="space-y-2">
                <Label>ຈຳນວນເງິນຫຼຸດ (₭)</Label>
                <Input
                  type="number"
                  value={promoForm.value}
                  onChange={(e) => setPromoForm({ ...promoForm, value: Number(e.target.value) })}
                  min={0}
                />
              </div>
            )}

            {promoForm.type === 'buy_x_get_y' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ຊື້ (X ຊິ້ນ)</Label>
                  <Input
                    type="number"
                    value={promoForm.buy_quantity}
                    onChange={(e) => setPromoForm({ ...promoForm, buy_quantity: Number(e.target.value) })}
                    min={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label>ແຖມ (Y ຊິ້ນ)</Label>
                  <Input
                    type="number"
                    value={promoForm.get_quantity}
                    onChange={(e) => setPromoForm({ ...promoForm, get_quantity: Number(e.target.value) })}
                    min={1}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>ຊື້ຂັ້ນຕ່ຳ (₭)</Label>
              <Input
                type="number"
                value={promoForm.min_purchase_amount}
                onChange={(e) => setPromoForm({ ...promoForm, min_purchase_amount: Number(e.target.value) })}
                min={0}
                placeholder="0 = ບໍ່ມີຂັ້ນຕ່ຳ"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ວັນເລີ່ມ</Label>
                <Input
                  type="date"
                  value={promoForm.start_date}
                  onChange={(e) => setPromoForm({ ...promoForm, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>ວັນສິ້ນສຸດ</Label>
                <Input
                  type="date"
                  value={promoForm.end_date}
                  onChange={(e) => setPromoForm({ ...promoForm, end_date: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label>ເປີດໃຊ້ງານ</Label>
              <Switch
                checked={promoForm.is_active}
                onCheckedChange={(checked) => setPromoForm({ ...promoForm, is_active: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPromoDialog(false)}>
              ຍົກເລີກ
            </Button>
            <Button onClick={handleSubmitPromo} disabled={processing || !promoForm.name.trim()}>
              {processing ? 'ກຳລັງບັນທຶກ...' : 'ບັນທຶກ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Coupon Dialog */}
      <Dialog open={showCouponDialog} onOpenChange={setShowCouponDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCoupon ? 'ແກ້ໄຂຄູປອງ' : 'ເພີ່ມຄູປອງ'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>ລະຫັດຄູປອງ *</Label>
              <Input
                value={couponForm.code}
                onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                placeholder="ເຊັ່ນ: NEWYEAR2024"
                className="font-mono uppercase"
              />
            </div>

            <div className="space-y-2">
              <Label>ຊື່ຄູປອງ *</Label>
              <Input
                value={couponForm.name}
                onChange={(e) => setCouponForm({ ...couponForm, name: e.target.value })}
                placeholder="ເຊັ່ນ: ສ່ວນຫຼຸດປີໃໝ່"
              />
            </div>

            <div className="space-y-2">
              <Label>ລາຍລະອຽດ</Label>
              <Textarea
                value={couponForm.description}
                onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })}
                placeholder="ລາຍລະອຽດເພີ່ມເຕີມ..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>ປະເພດສ່ວນຫຼຸດ</Label>
              <Select 
                value={couponForm.type} 
                onValueChange={(value: CouponType) => setCouponForm({ ...couponForm, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">ສ່ວນຫຼຸດ % (ເຊັ່ນ ຫຼຸດ 10%)</SelectItem>
                  <SelectItem value="fixed">ສ່ວນຫຼຸດຄົງທີ່ (ເຊັ່ນ ຫຼຸດ 50,000₭)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>ມູນຄ່າ{couponForm.type === 'percentage' ? ' (%)' : ' (₭)'}</Label>
              <Input
                type="number"
                value={couponForm.value}
                onChange={(e) => setCouponForm({ ...couponForm, value: Number(e.target.value) })}
                min={0}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ຊື້ຂັ້ນຕ່ຳ (₭)</Label>
                <Input
                  type="number"
                  value={couponForm.min_purchase_amount}
                  onChange={(e) => setCouponForm({ ...couponForm, min_purchase_amount: Number(e.target.value) })}
                  min={0}
                />
              </div>
              <div className="space-y-2">
                <Label>ຫຼຸດສູງສຸດ (₭)</Label>
                <Input
                  type="number"
                  value={couponForm.max_discount_amount}
                  onChange={(e) => setCouponForm({ ...couponForm, max_discount_amount: Number(e.target.value) })}
                  min={0}
                  placeholder="0 = ບໍ່ຈຳກັດ"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>ຈຳກັດການໃຊ້ (ຄັ້ງ)</Label>
              <Input
                type="number"
                value={couponForm.usage_limit}
                onChange={(e) => setCouponForm({ ...couponForm, usage_limit: Number(e.target.value) })}
                min={0}
                placeholder="0 = ບໍ່ຈຳກັດ"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ວັນເລີ່ມ</Label>
                <Input
                  type="date"
                  value={couponForm.start_date}
                  onChange={(e) => setCouponForm({ ...couponForm, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>ວັນສິ້ນສຸດ</Label>
                <Input
                  type="date"
                  value={couponForm.end_date}
                  onChange={(e) => setCouponForm({ ...couponForm, end_date: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label>ເປີດໃຊ້ງານ</Label>
              <Switch
                checked={couponForm.is_active}
                onCheckedChange={(checked) => setCouponForm({ ...couponForm, is_active: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCouponDialog(false)}>
              ຍົກເລີກ
            </Button>
            <Button onClick={handleSubmitCoupon} disabled={processing || !couponForm.code.trim() || !couponForm.name.trim()}>
              {processing ? 'ກຳລັງບັນທຶກ...' : 'ບັນທຶກ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
