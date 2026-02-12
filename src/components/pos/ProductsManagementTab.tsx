import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
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
  AlertTriangle,
  Printer,
  Barcode,
  Layers
} from 'lucide-react';
import { Product, ProductCategory, useProducts } from '@/hooks/useProducts';
import { useProductVariants } from '@/hooks/useProductVariants';
import { useToast } from '@/hooks/use-toast';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { printBarcodeLabels, printMultipleBarcodes } from '@/utils/barcodePrinter';
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
  unit: 'ຊິ້ນ',
  is_active: true,
};

interface VariantFormData {
  name: string;
  barcode: string;
  cost_price: number;
  selling_price: number;
  stock_quantity: number;
}

const initialVariantForm: VariantFormData = {
  name: '',
  barcode: '',
  cost_price: 0,
  selling_price: 0,
  stock_quantity: 0,
};

export function ProductsManagementTab() {
  const { products, categories, addProduct, updateProduct, deleteProduct, addCategory, importProducts } = useProducts();
  const { toast } = useToast();
  const { storeSettings } = useStoreSettings();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showBarcodeDialog, setShowBarcodeDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [barcodeQuantity, setBarcodeQuantity] = useState(1);
  const [singleBarcodeProduct, setSingleBarcodeProduct] = useState<Product | null>(null);
  
  // Variant management
  const [showVariantDialog, setShowVariantDialog] = useState(false);
  const [variantProductId, setVariantProductId] = useState<string | undefined>(undefined);
  const [variantForm, setVariantForm] = useState<VariantFormData>(initialVariantForm);
  const { variants, addVariant, deleteVariant } = useProductVariants(variantProductId);
  const [variantProductName, setVariantProductName] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({ title: 'ກະລຸນາປ້ອນຊື່ສິນຄ້າ', variant: 'destructive' });
      return;
    }

    setProcessing(true);
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, { ...formData, category_id: formData.category_id || null });
      } else {
        await addProduct({ ...formData, category_id: formData.category_id || null });
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

  const handlePrintSingleBarcode = (product: Product) => {
    setSingleBarcodeProduct(product);
    setBarcodeQuantity(1);
    setShowBarcodeDialog(true);
  };

  const handlePrintSelectedBarcodes = () => {
    const selectedProductsList = products.filter(p => selectedProducts.includes(p.id));
    if (selectedProductsList.length === 0) {
      toast({ title: 'ກະລຸນາເລືອກສິນຄ້າ', variant: 'destructive' });
      return;
    }
    printMultipleBarcodes(selectedProductsList, barcodeQuantity, { name: storeSettings.name });
    toast({ title: 'ກຳລັງພິມບາໂຄ້ດ', description: `${selectedProductsList.length} ສິນຄ້າ` });
    setSelectedProducts([]);
  };

  const handleConfirmPrintBarcode = () => {
    if (!singleBarcodeProduct) return;
    printBarcodeLabels({ product: singleBarcodeProduct, quantity: barcodeQuantity, storeInfo: { name: storeSettings.name } });
    toast({ title: 'ກຳລັງພິມບາໂຄ້ດ', description: `${singleBarcodeProduct.name} x ${barcodeQuantity}` });
    setShowBarcodeDialog(false);
    setSingleBarcodeProduct(null);
    setBarcodeQuantity(1);
  };

  const toggleProductSelection = (productId: string) => {
    setSelectedProducts(prev => prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]);
  };

  const toggleSelectAll = () => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts.map(p => p.id));
    }
  };

  // Open variant dialog for a product
  const handleOpenVariants = (product: Product) => {
    setVariantProductId(product.id);
    setVariantProductName(product.name);
    setVariantForm({ ...initialVariantForm, cost_price: product.cost_price, selling_price: product.selling_price });
    setShowVariantDialog(true);
  };

  const handleAddVariant = async () => {
    if (!variantProductId || !variantForm.name.trim()) {
      toast({ title: 'ກະລຸນາປ້ອນຊື່ຮູບແບບ', variant: 'destructive' });
      return;
    }
    
    await addVariant({
      product_id: variantProductId,
      attributes: { name: variantForm.name },
      barcode: variantForm.barcode || null,
      cost_price: variantForm.cost_price,
      selling_price: variantForm.selling_price,
      stock_quantity: variantForm.stock_quantity,
      image_url: null,
      is_active: true,
      sku: null,
    });
    
    setVariantForm({ ...initialVariantForm, cost_price: variantForm.cost_price, selling_price: variantForm.selling_price });
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
          unit: String(row['ໜ່ວຍ'] || row['unit'] || 'ຊິ້ນ'),
        }));

        await importProducts(productsData);
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      toast({ title: 'ເກີດຂໍ້ຜິດພາດ', description: 'ບໍ່ສາມາດອ່ານໄຟລ໌ Excel ໄດ້', variant: 'destructive' });
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
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
    if (filterCategory === 'uncategorized' && p.category_id) return false;
    if (filterCategory !== 'all' && filterCategory !== 'uncategorized' && p.category_id !== filterCategory) return false;
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(query) || p.barcode?.toLowerCase().includes(query);
  });

  const lowStockProducts = products.filter(p => p.stock_quantity <= p.min_stock_level);

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col gap-2 p-2 overflow-hidden">
      {/* Low Stock Warning */}
      {lowStockProducts.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/10 shrink-0">
          <CardContent className="p-2">
            <div className="flex items-center gap-2 text-destructive text-xs">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="font-medium">ມີ {lowStockProducts.length} ສິນຄ້າໃກ້ໝົດສະຕ໊ອກ</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions Bar */}
      <Card className="shrink-0">
        <CardContent className="p-2">
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div className="flex gap-2 flex-1 min-w-[200px]">
              <div className="relative flex-1 min-w-[150px]">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ຄົ້ນຫາສິນຄ້າ..."
                  className="pl-8 h-8 text-sm"
                />
              </div>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue placeholder="ໝວດໝູ່" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ທັງໝົດ</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                  <SelectItem value="uncategorized">ບໍ່ມີໝວດ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-1 flex-wrap">
              {selectedProducts.length > 0 && (
                <Button variant="secondary" size="sm" className="h-7 text-[10px]" onClick={handlePrintSelectedBarcodes}>
                  <Barcode className="w-3 h-3 mr-0.5" />
                  ພິມ ({selectedProducts.length})
                </Button>
              )}
              <input type="file" ref={fileInputRef} accept=".xlsx,.xls" onChange={handleImportExcel} className="hidden" />
              <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-3 h-3 mr-0.5" />
                ນຳເຂົ້າ
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={handleExportExcel}>
                <Download className="w-3 h-3 mr-0.5" />
                ສົ່ງອອກ
              </Button>
              <Button size="sm" className="h-7 text-[10px]" onClick={() => { setEditingProduct(null); setFormData(initialFormData); setShowAddProduct(true); }}>
                <Plus className="w-3 h-3 mr-0.5" />
                ເພີ່ມສິນຄ້າ
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <CardHeader className="py-2 px-3 shrink-0 border-b">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Package className="w-4 h-4" />
            ລາຍການສິນຄ້າ ({filteredProducts.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-2 min-h-0 overflow-hidden">
          <ScrollArea className="h-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-7 p-1">
                    <Checkbox 
                      checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="p-1 text-[10px] w-8">ຮູບ</TableHead>
                  <TableHead className="p-1 text-[10px]">ບາໂຄ້ດ</TableHead>
                  <TableHead className="p-1 text-[10px]">ຊື່ສິນຄ້າ</TableHead>
                  <TableHead className="text-right p-1 text-[10px]">ທຶນ</TableHead>
                  <TableHead className="text-right p-1 text-[10px]">ຂາຍ</TableHead>
                  <TableHead className="text-right p-1 text-[10px]">ສະຕ໊ອກ</TableHead>
                  <TableHead className="text-right p-1 text-[10px]">ຈັດການ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map(product => (
                  <TableRow key={product.id} className="h-9">
                    <TableCell className="p-1">
                      <Checkbox 
                        checked={selectedProducts.includes(product.id)}
                        onCheckedChange={() => toggleProductSelection(product.id)}
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-7 h-7 object-cover rounded" />
                      ) : (
                        <div className="w-7 h-7 bg-muted rounded flex items-center justify-center">
                          <Package className="w-3 h-3 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-[10px] p-1">{product.barcode || '-'}</TableCell>
                    <TableCell className="font-medium text-xs p-1 max-w-[120px] truncate" title={product.name}>
                      {product.name}
                    </TableCell>
                    <TableCell className="text-right text-[10px] p-1 text-muted-foreground">₭{product.cost_price.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-medium text-xs p-1">₭{product.selling_price.toLocaleString()}</TableCell>
                    <TableCell className="text-right p-1">
                      <Badge 
                        variant={product.stock_quantity <= product.min_stock_level ? 'destructive' : 'secondary'}
                        className="text-[10px] px-1"
                      >
                        {product.stock_quantity}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right p-1">
                      <div className="flex justify-end gap-0.5">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6"
                          onClick={() => handleOpenVariants(product)}
                          title="ຮູບແບບສິນຄ້າ"
                        >
                          <Layers className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handlePrintSingleBarcode(product)} title="ພິມບາໂຄ້ດ">
                          <Barcode className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEdit(product)}>
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDelete(product)}>
                          <Trash2 className="w-3 h-3" />
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

      {/* Barcode Dialog */}
      <Dialog open={showBarcodeDialog} onOpenChange={setShowBarcodeDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Barcode className="w-4 h-4" />
              ພິມບາໂຄ້ດ
            </DialogTitle>
          </DialogHeader>
          {singleBarcodeProduct && (
            <div className="space-y-3">
              <div className="p-3 bg-secondary rounded-lg text-center">
                <p className="font-medium text-sm">{singleBarcodeProduct.name}</p>
                <p className="text-lg font-mono mt-1">{singleBarcodeProduct.barcode || 'ບໍ່ມີບາໂຄ້ດ'}</p>
                <p className="text-sm font-bold text-primary mt-1">₭{singleBarcodeProduct.selling_price.toLocaleString()}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">ຈຳນວນ</Label>
                <Input type="number" value={barcodeQuantity} onChange={(e) => setBarcodeQuantity(Math.max(1, Number(e.target.value)))} min={1} max={100} className="h-8 text-sm" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowBarcodeDialog(false)}>ຍົກເລີກ</Button>
            <Button size="sm" onClick={handleConfirmPrintBarcode} disabled={!singleBarcodeProduct?.barcode}>
              <Printer className="w-3 h-3 mr-1" />
              ພິມ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Product Dialog */}
      <Dialog open={showAddProduct} onOpenChange={setShowAddProduct}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-4">
          <DialogHeader>
            <DialogTitle className="text-base">{editingProduct ? 'ແກ້ໄຂສິນຄ້າ' : 'ເພີ່ມສິນຄ້າໃໝ່'}</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">ບາໂຄ້ດ</Label>
              <Input value={formData.barcode} onChange={(e) => setFormData(prev => ({ ...prev, barcode: e.target.value }))} placeholder="ບາໂຄ້ດ" className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">ຊື່ສິນຄ້າ *</Label>
              <Input value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} placeholder="ຊື່ສິນຄ້າ" className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">ໝວດໝູ່</Label>
              <div className="flex gap-1">
                <Select value={formData.category_id} onValueChange={(v) => setFormData(prev => ({ ...prev, category_id: v }))}>
                  <SelectTrigger className="flex-1 h-8 text-sm"><SelectValue placeholder="ເລືອກ" /></SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setShowAddCategory(true)}>
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">ໜ່ວຍນັບ</Label>
              <Input value={formData.unit} onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))} placeholder="ຊິ້ນ, ກ່ອງ" className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">ລາຄາທຶນ</Label>
              <Input type="number" value={formData.cost_price} onChange={(e) => setFormData(prev => ({ ...prev, cost_price: Number(e.target.value) }))} min={0} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">ລາຄາຂາຍ</Label>
              <Input type="number" value={formData.selling_price} onChange={(e) => setFormData(prev => ({ ...prev, selling_price: Number(e.target.value) }))} min={0} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">ຈຳນວນສະຕ໊ອກ</Label>
              <Input type="number" value={formData.stock_quantity} onChange={(e) => setFormData(prev => ({ ...prev, stock_quantity: Number(e.target.value) }))} min={0} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">ສະຕ໊ອກຂັ້ນຕ່ຳ</Label>
              <Input type="number" value={formData.min_stock_level} onChange={(e) => setFormData(prev => ({ ...prev, min_stock_level: Number(e.target.value) }))} min={0} className="h-8 text-sm" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">URL ຮູບສິນຄ້າ</Label>
              <Input value={formData.image_url} onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))} placeholder="https://..." className="h-8 text-sm" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">ລາຍລະອຽດ</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} placeholder="ລາຍລະອຽດ" rows={2} className="text-sm" />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <Switch checked={formData.is_active} onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))} />
              <Label className="text-xs">ເປີດໃຊ້ງານ</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowAddProduct(false)}>ຍົກເລີກ</Button>
            <Button size="sm" onClick={handleSubmit} disabled={processing}>
              {processing ? 'ກຳລັງບັນທຶກ...' : (editingProduct ? 'ອັບເດດ' : 'ເພີ່ມສິນຄ້າ')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Category Dialog */}
      <Dialog open={showAddCategory} onOpenChange={setShowAddCategory}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-base">ເພີ່ມໝວດໝູ່ໃໝ່</DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            <Label className="text-xs">ຊື່ໝວດໝູ່</Label>
            <Input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="ຊື່ໝວດໝູ່" className="h-8 text-sm" />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowAddCategory(false)}>ຍົກເລີກ</Button>
            <Button size="sm" onClick={handleAddCategory}>ເພີ່ມ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Variant Management Dialog */}
      <Dialog open={showVariantDialog} onOpenChange={(open) => { setShowVariantDialog(open); if (!open) setVariantProductId(undefined); }}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto p-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Layers className="w-4 h-4" />
              ຮູບແບບສິນຄ້າ: {variantProductName}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3">
            {/* Existing variants */}
            {variants.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">ຮູບແບບທີ່ມີ</Label>
                {variants.map(v => (
                  <div key={v.id} className="flex items-center justify-between p-2 bg-secondary/50 rounded-lg text-sm">
                    <div>
                      <p className="font-medium text-xs">{Object.values(v.attributes).join(' / ')}</p>
                      <p className="text-[10px] text-muted-foreground">
                        ທຶນ: ₭{v.cost_price.toLocaleString()} | ຂາຍ: ₭{v.selling_price.toLocaleString()} | ສະຕ໊ອກ: {v.stock_quantity}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteVariant(v.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new variant form */}
            <div className="border-t pt-3 space-y-2">
              <Label className="text-xs font-medium">ເພີ່ມຮູບແບບໃໝ່</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2 space-y-1">
                  <Label className="text-[10px]">ຊື່ຮູບແບບ (ເຊັ່ນ: 1ແພັກ, XL, ສີແດງ)</Label>
                  <Input 
                    value={variantForm.name} 
                    onChange={(e) => setVariantForm(prev => ({ ...prev, name: e.target.value }))} 
                    placeholder="1ແພັກ, XL, ສີແດງ..." 
                    className="h-8 text-sm" 
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">ບາໂຄ້ດ</Label>
                  <Input 
                    value={variantForm.barcode} 
                    onChange={(e) => setVariantForm(prev => ({ ...prev, barcode: e.target.value }))} 
                    placeholder="ບາໂຄ້ດ" 
                    className="h-8 text-sm" 
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">ສະຕ໊ອກ</Label>
                  <Input 
                    type="number" 
                    value={variantForm.stock_quantity} 
                    onChange={(e) => setVariantForm(prev => ({ ...prev, stock_quantity: Number(e.target.value) }))} 
                    className="h-8 text-sm" 
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">ລາຄາທຶນ</Label>
                  <Input 
                    type="number" 
                    value={variantForm.cost_price} 
                    onChange={(e) => setVariantForm(prev => ({ ...prev, cost_price: Number(e.target.value) }))} 
                    className="h-8 text-sm" 
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">ລາຄາຂາຍ</Label>
                  <Input 
                    type="number" 
                    value={variantForm.selling_price} 
                    onChange={(e) => setVariantForm(prev => ({ ...prev, selling_price: Number(e.target.value) }))} 
                    className="h-8 text-sm" 
                  />
                </div>
              </div>
              <Button size="sm" className="w-full h-8 text-xs" onClick={handleAddVariant} disabled={!variantForm.name.trim()}>
                <Plus className="w-3 h-3 mr-1" />
                ເພີ່ມຮູບແບບ
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
