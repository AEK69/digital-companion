import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Package, Minus, Plus } from 'lucide-react';
import { useProductVariants, ProductVariant } from '@/hooks/useProductVariants';

interface CartItemVariantSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  cartItem: {
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    stock_quantity: number;
  };
  productId: string; // Original product ID to fetch variants
  onSelectVariant: (variant: ProductVariant) => void;
  onUpdateQuantity: (quantity: number) => void;
}

export function CartItemVariantSelector({
  isOpen,
  onClose,
  cartItem,
  productId,
  onSelectVariant,
  onUpdateQuantity,
}: CartItemVariantSelectorProps) {
  const { variants, loading } = useProductVariants(productId);
  const [quantity, setQuantity] = useState(cartItem.quantity);

  const handleQuantityChange = (value: string) => {
    const num = parseInt(value) || 0;
    if (num >= 0 && num <= cartItem.stock_quantity) {
      setQuantity(num);
    }
  };

  const handleConfirm = () => {
    if (quantity !== cartItem.quantity) {
      onUpdateQuantity(quantity);
    }
    onClose();
  };

  const activeVariants = variants.filter(v => v.is_active && v.stock_quantity > 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xs p-4">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-sm truncate">{cartItem.product_name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quantity Editor */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">ຈຳນວນ</p>
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10"
                onClick={() => quantity > 1 && setQuantity(q => q - 1)}
                disabled={quantity <= 1}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => handleQuantityChange(e.target.value)}
                className="w-20 text-center text-lg font-bold h-10"
                min={1}
                max={cartItem.stock_quantity}
              />
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10"
                onClick={() => quantity < cartItem.stock_quantity && setQuantity(q => q + 1)}
                disabled={quantity >= cartItem.stock_quantity}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-center text-muted-foreground">
              ສະຕ໊ອກ: {cartItem.stock_quantity}
            </p>
          </div>

          {/* Variants Selection */}
          {activeVariants.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">ເລືອກຕົວເລືອກ</p>
              <div className="grid grid-cols-1 gap-2">
                {loading ? (
                  <p className="text-xs text-center text-muted-foreground py-2">ກຳລັງໂຫຼດ...</p>
                ) : (
                  activeVariants.map((variant) => (
                    <button
                      key={variant.id}
                      onClick={() => {
                        onSelectVariant(variant);
                        onClose();
                      }}
                      className="p-3 rounded-lg border hover:border-primary hover:bg-primary/5 transition-all text-left"
                    >
                      <div className="flex items-center gap-3">
                        {variant.image_url ? (
                          <img
                            src={variant.image_url}
                            alt=""
                            className="w-10 h-10 object-cover rounded"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                            <Package className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">
                            {Object.values(variant.attributes || {}).join(' / ') || 'ມາດຕະຖານ'}
                          </p>
                          <p className="text-xs text-primary font-bold">
                            ₭{variant.selling_price.toLocaleString()}
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {variant.stock_quantity}
                        </Badge>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Confirm Button */}
          <Button onClick={handleConfirm} className="w-full">
            ຢືນຢັນ
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
