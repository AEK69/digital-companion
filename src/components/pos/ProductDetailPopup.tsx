import { Product } from '@/hooks/useProducts';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, ShoppingCart, AlertTriangle, DollarSign, Barcode, Layers, Tag } from 'lucide-react';
import { useProductVariants } from '@/hooks/useProductVariants';

interface ProductDetailPopupProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onAddToCart: (product: Product) => void;
  categories?: { id: string; name: string }[];
}

export function ProductDetailPopup({ isOpen, onClose, product, onAddToCart, categories }: ProductDetailPopupProps) {
  const { variants } = useProductVariants(product?.id || '');

  if (!product) return null;

  const category = categories?.find(c => c.id === product.category_id);
  const profit = product.selling_price - product.cost_price;
  const profitMargin = product.cost_price > 0 ? ((profit / product.cost_price) * 100).toFixed(1) : '0';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">{product.name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Product Image */}
          <div className="w-full aspect-video bg-muted rounded-lg overflow-hidden flex items-center justify-center">
            {product.image_url ? (
              <img 
                src={product.image_url} 
                alt={product.name}
                className="w-full h-full object-contain"
              />
            ) : (
              <Package className="w-16 h-16 text-muted-foreground" />
            )}
          </div>

          {/* Price Section */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-primary/10 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">ລາຄາຂາຍ</p>
              <p className="text-2xl font-bold text-primary">₭{product.selling_price.toLocaleString()}</p>
            </div>
            <div className="bg-muted rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">ລາຄາທຶນ</p>
              <p className="text-2xl font-bold">₭{product.cost_price.toLocaleString()}</p>
            </div>
          </div>

          {/* Profit Info */}
          <div className="flex items-center justify-between bg-accent/50 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-accent-foreground" />
              <span className="font-medium">ກຳໄລ</span>
            </div>
            <div className="text-right">
              <span className="font-bold text-lg">₭{profit.toLocaleString()}</span>
              <span className="text-sm text-muted-foreground ml-2">({profitMargin}%)</span>
            </div>
          </div>

          {/* Product Details */}
          <div className="space-y-3">
            {product.barcode && (
              <div className="flex items-center gap-3">
                <Barcode className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm">ບາໂຄ້ດ:</span>
                <span className="font-mono font-medium">{product.barcode}</span>
              </div>
            )}
            
            {category && (
              <div className="flex items-center gap-3">
                <Tag className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm">ໝວດໝູ່:</span>
                <Badge variant="secondary">{category.name}</Badge>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Layers className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm">ຫົວໜ່ວຍ:</span>
              <span className="font-medium">{product.unit}</span>
            </div>

            {product.description && (
              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground">{product.description}</p>
              </div>
            )}
          </div>

          {/* Stock Status */}
          <div className={`flex items-center justify-between p-4 rounded-lg ${
            product.stock_quantity <= 0 
              ? 'bg-destructive/10' 
              : product.stock_quantity <= product.min_stock_level 
                ? 'bg-warning/10' 
                : 'bg-accent/50'
          }`}>
            <div className="flex items-center gap-3">
              {product.stock_quantity <= product.min_stock_level && (
                <AlertTriangle className="w-5 h-5 text-warning" />
              )}
              <div>
                <p className="font-medium">ສະຕ໊ອກຄົງເຫຼືອ</p>
                <p className="text-sm text-muted-foreground">ຂັ້ນຕ່ຳ: {product.min_stock_level} {product.unit}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">{product.stock_quantity}</p>
              <p className="text-sm text-muted-foreground">{product.unit}</p>
            </div>
          </div>

          {/* Variants Info */}
          {variants.length > 0 && (
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm text-muted-foreground mb-2">ມີ {variants.length} ຕົວເລືອກ (ສີ, ຂະໜາດ, ແລະອື່ນໆ)</p>
              <div className="flex flex-wrap gap-2">
                {variants.slice(0, 5).map(variant => (
                  <Badge key={variant.id} variant="outline" className="text-xs">
                    {Object.values(variant.attributes || {}).join(' / ')}
                  </Badge>
                ))}
                {variants.length > 5 && (
                  <Badge variant="outline" className="text-xs">+{variants.length - 5}</Badge>
                )}
              </div>
            </div>
          )}

          {/* Action Button */}
          <Button 
            className="w-full h-14 text-lg font-bold" 
            disabled={product.stock_quantity <= 0}
            onClick={() => {
              onAddToCart(product);
              onClose();
            }}
          >
            <ShoppingCart className="w-6 h-6 mr-2" />
            {product.stock_quantity <= 0 ? 'ໝົດສະຕ໊ອກ' : 'ເພີ່ມໃສ່ຕະກ້າ'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
