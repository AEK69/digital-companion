import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Wifi, WifiOff, RefreshCw, Cloud, Loader2 } from 'lucide-react';
import { useOfflineSales } from '@/hooks/useOfflineSales';

export function OfflineIndicator() {
  const { isOnline, pendingCount, syncing, syncOfflineSales } = useOfflineSales();
  const [open, setOpen] = useState(false);

  if (isOnline && pendingCount === 0) {
    return (
      <Badge variant="outline" className="flex items-center gap-1 text-green-600 border-green-600">
        <Wifi className="w-3 h-3" />
        <span className="hidden sm:inline">ອອນໄລນ໌</span>
      </Badge>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className={`flex items-center gap-1 ${
            isOnline ? 'border-yellow-500 text-yellow-600' : 'border-red-500 text-red-600'
          }`}
        >
          {isOnline ? (
            syncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Cloud className="w-3 h-3" />
          ) : (
            <WifiOff className="w-3 h-3" />
          )}
          <span className="hidden sm:inline">
            {isOnline ? (syncing ? 'ກຳລັງ Sync...' : `${pendingCount} ລໍຖ້າ`) : 'ອອບໄລນ໌'}
          </span>
          {!isOnline && pendingCount > 0 && (
            <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">
              {pendingCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="w-5 h-5 text-green-600" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-600" />
            )}
            <div>
              <p className="font-medium">
                {isOnline ? 'ເຊື່ອມຕໍ່ແລ້ວ' : 'ບໍ່ມີອິນເຕີເນັດ'}
              </p>
              <p className="text-xs text-muted-foreground">
                {isOnline 
                  ? 'ລະບົບເຊື່ອມຕໍ່ກັບເຊີບເວີປົກກະຕິ' 
                  : 'ການຂາຍຈະບັນທຶກໄວ້ ແລະ sync ເມື່ອເນັດມາ'}
              </p>
            </div>
          </div>

          {pendingCount > 0 && (
            <div className="p-3 bg-secondary rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-sm">{pendingCount} ລາຍການລໍຖ້າ Sync</p>
                  <p className="text-xs text-muted-foreground">
                    ບັນທຶກໄວ້ໃນອຸປະກອນນີ້
                  </p>
                </div>
                {isOnline && (
                  <Button 
                    size="sm" 
                    onClick={() => {
                      syncOfflineSales();
                      setOpen(false);
                    }}
                    disabled={syncing}
                  >
                    {syncing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}

          {!isOnline && (
            <p className="text-xs text-muted-foreground">
              💡 ທ່ານສາມາດສືບຕໍ່ຂາຍໄດ້ປົກກະຕິ ຂໍ້ມູນຈະຖືກ sync ອັດຕະໂນມັດເມື່ອເຊື່ອມຕໍ່ອິນເຕີເນັດ
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
