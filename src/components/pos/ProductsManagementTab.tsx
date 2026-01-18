import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
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
  Search, 
  Edit, 
  Trash2, 
  Package,
  Upload,
  Download,
  AlertTriangle
} from 'lucide-react';
import { Product, ProductCategory, useProducts } from '@/hooks/useProducts';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

interface ProductFormData {
  barcode: string;
  name: string;
  description: string;
  category_id: string;
  image_url: string;
  cost_price: number;
  selling_price: number;
  stock_quantity: number;
  min_stock_level: number;
  unit: string;
  is_active: boolean;
}

const initialFormData: ProductFormData = {
  barcode: '',
  name: '',
  description: '',
  category_id: '',
  image_url: '',
  cost_price: 0,
  selling_price: 0,
  stock_quantity: 0,
  min_stock_level: 5,
  unit: 'ชิ้น',
  is_active: true,
};

export function ProductsManagementTab() {
  const { products, categories, addProduct, updateProduct, deleteProduct, addCategory, importProducts } = useProducts();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [processing, setProcessing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({
        title: 'ກະລຸນາປ້ອນຊື່ສິນຄ້າ',
        variant: 'destructive',
      });
      return;
    }

    setProcessing(true);
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, {
          ...formData,
          category_id: formData.category_id || null,
        });
      } else {
        await addProduct({
          ...formData,
          category_id: formData.category_id || null,
        });
      }
      setShowAddProduct(false);
      setEditingProduct(null);
      setFormData(initialFormData);
    } finally {
      setProcessing(false);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      barcode: product.barcode || '',
      name: product.name,
      description: product.description || '',
      category_id: product.category_id || '',
      image_url: product.image_url || '',
      cost_price: product.cost_price,
      selling_price: product.selling_price,
      stock_quantity: product.stock_quantity,
      min_stock_level: product.min_stock_level,
      unit: product.unit,
      is_active: product.is_active,
    });
    setShowAddProduct(true);
  };

  const handleDelete = async (product: Product) => {
    if (confirm(`ຕ້ອງການລຶບ "${product.name}" ແທ້ຫຼືບໍ່?`)) {
      await deleteProduct(product.id);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    await addCategory({ name: newCategoryName });
    setNewCategoryName('');
    setShowAddCategory(false);
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);

        const productsData = jsonData.map((row: any) => ({
          barcode: String(row['ບາໂຄ້ດ'] || row['barcode'] || ''),
          name: String(row['ຊື່ສິນຄ້າ'] || row['name'] || ''),
          description: String(row['ລາຍລະອຽດ'] || row['description'] || ''),
          cost_price: Number(row['ລາຄາທຶນ'] || row['cost_price'] || 0),
          selling_price: Number(row['ລາຄາຂາຍ'] || row['selling_price'] || 0),
          stock_quantity: Number(row['ຈຳນວນ'] || row['stock_quantity'] || 0),
          min_stock_level: Number(row['ຂັ້ນຕ່ຳ'] || row['min_stock_level'] || 5),
          unit: String(row['ໜ່ວຍ'] || row['unit'] || 'ชิ้น'),
        }));

        await importProducts(productsData);
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      toast({
        title: 'ເກີດຂໍ້ຜິດພາດ',
        description: 'ບໍ່ສາມາດອ່ານໄຟລ໌ Excel ໄດ້',
        variant: 'destructive',
      });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExportExcel = () => {
    const exportData = products.map(p => ({
      'ບາໂຄ້ດ': p.barcode || '',
      'ຊື່ສິນຄ້າ': p.name,
      'ລາຍລະອຽດ': p.description || '',
      'ລາຄາທຶນ': p.cost_price,
      'ລາຄາຂາຍ': p.selling_price,
      'ຈຳນວນ': p.stock_quantity,
      'ຂັ້ນຕ່ຳ': p.min_stock_level,
      'ໜ່ວຍ': p.unit,
      'ສະຖານະ': p.is_active ? 'ເປີດໃຊ້ງານ' : 'ປິດ',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ສິນຄ້າ');
    XLSX.writeFile(wb, `products-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const filteredProducts = products.filter(p => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(query) || 
           p.barcode?.toLowerCase().includes(query);
  });

  const lowStockProducts = products.filter(p => p.stock_quantity <= p.min_stock_level);

  return (
    <div className="space-y-4">
      {/* Low Stock Warning */}
      {lowStockProducts.length > 0 && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">
                ມີ {lowStockProducts.length} ສິນຄ້າໃກ້ໝົດສະຕ໊ອກ
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ຄົ້ນຫາສິນຄ້າ..."
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                accept=".xlsx,.xls"
                onChange={handleImportExcel}
                className="hidden"
              />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" />
                ນຳເຂົ້າ Excel
              </Button>
              <Button variant="outline" onClick={handleExportExcel}>
                <Download className="w-4 h-4 mr-2" />
                ສົ່ງອອກ Excel
              </Button>
              <Button onClick={() => { setEditingProduct(null); setFormData(initialFormData); setShowAddProduct(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                ເພີ່ມສິນຄ້າ
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            ລາຍການສິນຄ້າ ({filteredProducts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ຮູບ</TableHead>
                  <TableHead>ບາໂຄ້ດ</TableHead>
                  <TableHead>ຊື່ສິນຄ້າ</TableHead>
                  <TableHead className="text-right">ລາຄາທຶນ</TableHead>
                  <TableHead className="text-right">ລາຄາຂາຍ</TableHead>
                  <TableHead className="text-right">ສະຕ໊ອກ</TableHead>
                  <TableHead>ສະຖານະ</TableHead>
                  <TableHead className="text-right">ຈັດການ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map(product => (
                  <TableRow key={product.id}>
                    <TableCell>
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-10 h-10 object-cover rounded" />
                      ) : (
                        <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                          <Package className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{product.barcode || '-'}</TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="text-right">₭{product.cost_price.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-medium">₭{product.selling_price.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={product.stock_quantity <= product.min_stock_level ? 'destructive' : 'secondary'}>
                        {product.stock_quantity} {product.unit}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.is_active ? 'default' : 'outline'}>
                        {product.is_active ? 'ເປີດ' : 'ປິດ'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(product)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(product)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Add/Edit Product Dialog */}
      <Dialog open={showAddProduct} onOpenChange={setShowAddProduct}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'ແກ້ໄຂສິນຄ້າ' : 'ເພີ່ມສິນຄ້າໃໝ່'}</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>ບາໂຄ້ດ</Label>
              <Input
                value={formData.barcode}
                onChange={(e) => setFormData(prev => ({ ...prev, barcode: e.target.value }))}
                placeholder="ບາໂຄ້ດສິນຄ້າ"
              />
            </div>
            <div className="space-y-2">
              <Label>ຊື່ສິນຄ້າ *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="ຊື່ສິນຄ້າ"
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>ລາຍລະອຽດ</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="ລາຍລະອຽດສິນຄ້າ"
              />
            </div>
            <div className="space-y-2">
              <Label>ໝວດໝູ່</Label>
              <div className="flex gap-2">
                <Select 
                  value={formData.category_id} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, category_id: v }))}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="ເລືອກໝວດໝູ່" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={() => setShowAddCategory(true)}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>ໜ່ວຍນັບ</Label>
              <Input
                value={formData.unit}
                onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                placeholder="ชิ้น, กล่อง, ขวด"
              />
            </div>
            <div className="space-y-2">
              <Label>ລາຄາທຶນ</Label>
              <Input
                type="number"
                value={formData.cost_price}
                onChange={(e) => setFormData(prev => ({ ...prev, cost_price: Number(e.target.value) }))}
                min={0}
              />
            </div>
            <div className="space-y-2">
              <Label>ລາຄາຂາຍ</Label>
              <Input
                type="number"
                value={formData.selling_price}
                onChange={(e) => setFormData(prev => ({ ...prev, selling_price: Number(e.target.value) }))}
                min={0}
              />
            </div>
            <div className="space-y-2">
              <Label>ຈຳນວນສະຕ໊ອກ</Label>
              <Input
                type="number"
                value={formData.stock_quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, stock_quantity: Number(e.target.value) }))}
                min={0}
              />
            </div>
            <div className="space-y-2">
              <Label>ສະຕ໊ອກຂັ້ນຕ່ຳ</Label>
              <Input
                type="number"
                value={formData.min_stock_level}
                onChange={(e) => setFormData(prev => ({ ...prev, min_stock_level: Number(e.target.value) }))}
                min={0}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>URL ຮູບສິນຄ້າ</Label>
              <Input
                value={formData.image_url}
                onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
              <Label>ເປີດໃຊ້ງານສິນຄ້ານີ້</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddProduct(false)}>
              ຍົກເລີກ
            </Button>
            <Button onClick={handleSubmit} disabled={processing}>
              {processing ? 'ກຳລັງບັນທຶກ...' : (editingProduct ? 'ອັບເດດ' : 'ເພີ່ມສິນຄ້າ')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Category Dialog */}
      <Dialog open={showAddCategory} onOpenChange={setShowAddCategory}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ເພີ່ມໝວດໝູ່ໃໝ່</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>ຊື່ໝວດໝູ່</Label>
            <Input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="ຊື່ໝວດໝູ່"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCategory(false)}>
              ຍົກເລີກ
            </Button>
            <Button onClick={handleAddCategory}>ເພີ່ມ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
