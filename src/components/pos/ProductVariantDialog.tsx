import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Trash2, Edit, Package, Barcode } from 'lucide-react';
import { useProductVariants, ProductVariant } from '@/hooks/useProductVariants';
import { Product } from '@/hooks/useProducts';

interface ProductVariantDialogProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectVariant?: (variant: ProductVariant) => void;
}

interface VariantFormData {
  sku: string;
  barcode: string;
  attributeName: string;
  attributeValue: string;
  cost_price: number;
  selling_price: number;
  stock_quantity: number;
  is_active: boolean;
}

const initialFormData: VariantFormData = {
  sku: '',
  barcode: '',
  attributeName: 'ຂະໜາດ',
  attributeValue: '',
  cost_price: 0,
  selling_price: 0,
  stock_quantity: 0,
  is_active: true,
};

export function ProductVariantDialog({ product, isOpen, onClose, onSelectVariant }: ProductVariantDialogProps) {
  const { variants, loading, addVariant, updateVariant, deleteVariant, refetch } = useProductVariants(product?.id);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [formData, setFormData] = useState<VariantFormData>(initialFormData);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData(prev => ({
        ...prev,
        cost_price: product.cost_price,
        selling_price: product.selling_price,
      }));
    }
  }, [product]);

  useEffect(() => {
    if (isOpen && product) {
      refetch();
    }
  }, [isOpen, product, refetch]);

  const handleSubmit = async () => {
    if (!product || !formData.attributeValue.trim()) return;
    
    setProcessing(true);
    try {
      const variantData = {
        product_id: product.id,
        sku: formData.sku || null,
        barcode: formData.barcode || null,
        attributes: { [formData.attributeName]: formData.attributeValue },
        cost_price: formData.cost_price,
        selling_price: formData.selling_price,
        stock_quantity: formData.stock_quantity,
        image_url: null,
        is_active: formData.is_active,
      };

      if (editingVariant) {
        await updateVariant(editingVariant.id, variantData);
      } else {
        await addVariant(variantData);
      }
      
      setShowAddForm(false);
      setEditingVariant(null);
      setFormData({
        ...initialFormData,
        cost_price: product.cost_price,
        selling_price: product.selling_price,
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleEdit = (variant: ProductVariant) => {
    const attrEntries = Object.entries(variant.attributes);
    const [attrName, attrValue] = attrEntries[0] || ['ຂະໜາດ', ''];
    
    setEditingVariant(variant);
    setFormData({
      sku: variant.sku || '',
      barcode: variant.barcode || '',
      attributeName: attrName,
      attributeValue: attrValue,
      cost_price: variant.cost_price,
      selling_price: variant.selling_price,
      stock_quantity: variant.stock_quantity,
      is_active: variant.is_active,
    });
    setShowAddForm(true);
  };

  const handleDelete = async (variant: ProductVariant) => {
    const attrStr = Object.values(variant.attributes).join(', ');
    if (confirm(`ຕ້ອງການລຶບຕົວເລືອກ "${attrStr}" ແທ້ຫຼືບໍ່?`)) {
      await deleteVariant(variant.id);
    }
  };

  const handleSelectVariant = (variant: ProductVariant) => {
    if (onSelectVariant) {
      onSelectVariant(variant);
      onClose();
    }
  };

  const getAttributeDisplay = (attrs: Record<string, string>) => {
    return Object.entries(attrs).map(([k, v]) => `${k}: ${v}`).join(', ');
  };

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            ຕົວເລືອກສິນຄ້າ: {product.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Main product info */}
          <div className="p-3 bg-secondary/50 rounded-lg mb-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">{product.name}</p>
                <p className="text-sm text-muted-foreground">
                  ບາໂຄ້ດ: {product.barcode || 'ບໍ່ມີ'} | ລາຄາ: ₭{product.selling_price.toLocaleString()}
                </p>
              </div>
              <Badge variant="secondary">
                ສະຕ໊ອກ: {product.stock_quantity} {product.unit}
              </Badge>
            </div>
          </div>

          {!showAddForm ? (
            <>
              {/* Variants list */}
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium text-sm">ຕົວເລືອກທັງໝົດ ({variants.length})</h4>
                <Button size="sm" onClick={() => setShowAddForm(true)}>
                  <Plus className="w-4 h-4 mr-1" />
                  ເພີ່ມຕົວເລືອກ
                </Button>
              </div>

              <ScrollArea className="flex-1">
                {variants.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>ຍັງບໍ່ມີຕົວເລືອກສິນຄ້າ</p>
                    <p className="text-sm">ເພີ່ມຕົວເລືອກເຊັ່ນ: 1ຕຸກ, 1ແພັກ, ສີຕ່າງໆ</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ຕົວເລືອກ</TableHead>
                        <TableHead>ບາໂຄ້ດ</TableHead>
                        <TableHead className="text-right">ລາຄາ</TableHead>
                        <TableHead className="text-right">ສະຕ໊ອກ</TableHead>
                        <TableHead className="text-right">ຈັດການ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {variants.map(variant => (
                        <TableRow 
                          key={variant.id}
                          className={onSelectVariant ? 'cursor-pointer hover:bg-primary/10' : ''}
                          onClick={() => onSelectVariant && handleSelectVariant(variant)}
                        >
                          <TableCell>
                            <Badge variant="outline">
                              {getAttributeDisplay(variant.attributes)}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {variant.barcode || '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ₭{variant.selling_price.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={variant.stock_quantity <= 5 ? 'destructive' : 'secondary'}>
                              {variant.stock_quantity}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(variant)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(variant)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </ScrollArea>
            </>
          ) : (
            /* Add/Edit form */
            <ScrollArea className="flex-1">
              <div className="space-y-4 pr-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>ປະເພດຕົວເລືອກ</Label>
                    <Input
                      value={formData.attributeName}
                      onChange={(e) => setFormData({ ...formData, attributeName: e.target.value })}
                      placeholder="ເຊັ່ນ: ຂະໜາດ, ສີ"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>ຄ່າຕົວເລືອກ *</Label>
                    <Input
                      value={formData.attributeValue}
                      onChange={(e) => setFormData({ ...formData, attributeValue: e.target.value })}
                      placeholder="ເຊັ່ນ: 1ຕຸກ, 1ແພັກ, ແດງ"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>SKU</Label>
                    <Input
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      placeholder="ລະຫັດ SKU"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <Barcode className="w-4 h-4" />
                      ບາໂຄ້ດ
                    </Label>
                    <Input
                      value={formData.barcode}
                      onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                      placeholder="ບາໂຄ້ດສະເພາະຕົວເລືອກ"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>ລາຄາທຶນ (₭)</Label>
                    <Input
                      type="number"
                      value={formData.cost_price}
                      onChange={(e) => setFormData({ ...formData, cost_price: Number(e.target.value) })}
                      min={0}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>ລາຄາຂາຍ (₭)</Label>
                    <Input
                      type="number"
                      value={formData.selling_price}
                      onChange={(e) => setFormData({ ...formData, selling_price: Number(e.target.value) })}
                      min={0}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>ຈຳນວນສະຕ໊ອກ</Label>
                    <Input
                      type="number"
                      value={formData.stock_quantity}
                      onChange={(e) => setFormData({ ...formData, stock_quantity: Number(e.target.value) })}
                      min={0}
                    />
                  </div>
                  <div className="flex items-center justify-between pt-6">
                    <Label>ເປີດໃຊ້ງານ</Label>
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter className="mt-4">
          {showAddForm ? (
            <>
              <Button variant="outline" onClick={() => { setShowAddForm(false); setEditingVariant(null); }}>
                ກັບຄືນ
              </Button>
              <Button onClick={handleSubmit} disabled={processing || !formData.attributeValue.trim()}>
                {processing ? 'ກຳລັງບັນທຶກ...' : editingVariant ? 'ອັບເດດ' : 'ເພີ່ມ'}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={onClose}>
              ປິດ
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
