import { useState, useRef } from 'react';
import { Settings, Store, Users, Plus, Trash2, Save, Download, Upload, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Employee, StoreInfo } from '@/types';
import { toast } from 'sonner';

interface SettingsTabProps {
  storeInfo: StoreInfo;
  employees: Employee[];
  onUpdateStoreInfo: (info: StoreInfo) => void;
  onAddEmployee: (employee: Omit<Employee, 'id'>) => void;
  onDeleteEmployee: (id: string) => void;
  onExportData: () => void;
}

export function SettingsTab({
  storeInfo,
  employees,
  onUpdateStoreInfo,
  onAddEmployee,
  onDeleteEmployee,
  onExportData,
}: SettingsTabProps) {
  const [storeName, setStoreName] = useState(storeInfo.name);
  const [storePhone, setStorePhone] = useState(storeInfo.phone || '');
  const [storeAddress, setStoreAddress] = useState(storeInfo.address || '');
  const [storeLogo, setStoreLogo] = useState(storeInfo.logo || '');

  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [newEmployeeRate, setNewEmployeeRate] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveStore = () => {
    onUpdateStoreInfo({
      ...storeInfo,
      name: storeName,
      phone: storePhone,
      address: storeAddress,
      logo: storeLogo || undefined,
    });
  };

  const handleAddEmployee = () => {
    if (!newEmployeeName || !newEmployeeRate) return;
    onAddEmployee({
      name: newEmployeeName,
      hourlyRate: parseFloat(newEmployeeRate),
    });
    setNewEmployeeName('');
    setNewEmployeeRate('');
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('ຮູບພາບຕ້ອງບໍ່ເກີນ 2MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setStoreLogo(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setStoreLogo('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Store Info */}
      <div className="card-luxury rounded-xl p-6">
        <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
          <Store className="w-5 h-5" />
          ຂໍ້ມູນຮ້ານ
        </h3>

        <div className="space-y-4">
          {/* Store Logo */}
          <div className="space-y-2">
            <label className="text-sm font-medium">ໂລໂກ້ຮ້ານ</label>
            <div className="flex items-center gap-4">
              {storeLogo ? (
                <div className="relative">
                  <img 
                    src={storeLogo} 
                    alt="Store Logo" 
                    className="w-20 h-20 rounded-lg object-cover border-2 border-primary/20"
                  />
                  <button
                    onClick={handleRemoveLogo}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-20 h-20 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                  <Image className="w-8 h-8 text-muted-foreground/50" />
                </div>
              )}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  ອັບໂຫຼດຮູບ
                </Button>
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG ບໍ່ເກີນ 2MB</p>
              </div>
            </div>
          </div>

          <Input
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            placeholder="ຊື່ຮ້ານ"
            className="input-luxury"
          />
          <Input
            value={storePhone}
            onChange={(e) => setStorePhone(e.target.value)}
            placeholder="ເບີໂທ"
            className="input-luxury"
          />
          <Input
            value={storeAddress}
            onChange={(e) => setStoreAddress(e.target.value)}
            placeholder="ທີ່ຢູ່"
            className="input-luxury"
          />
          <Button onClick={handleSaveStore} className="w-full btn-gold gap-2">
            <Save className="w-4 h-4" />
            ບັນທຶກຂໍ້ມູນຮ້ານ
          </Button>
        </div>
      </div>

      {/* Employee Management */}
      <div className="card-luxury rounded-xl p-6">
        <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" />
          ຈັດການພະນັກງານ
        </h3>

        {/* Add Employee */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Input
            value={newEmployeeName}
            onChange={(e) => setNewEmployeeName(e.target.value)}
            placeholder="ຊື່ພະນັກງານ"
            className="input-luxury col-span-2"
          />
          <Input
            type="number"
            value={newEmployeeRate}
            onChange={(e) => setNewEmployeeRate(e.target.value)}
            placeholder="ຄ່າແຮງ/ຊມ"
            className="input-luxury"
          />
        </div>
        <Button onClick={handleAddEmployee} className="w-full btn-gold gap-2 mb-4">
          <Plus className="w-4 h-4" />
          ເພີ່ມພະນັກງານ
        </Button>

        {/* Employee List */}
        <div className="space-y-2">
          {employees.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">ບໍ່ມີພະນັກງານ</p>
          ) : (
            employees.map((emp) => (
              <div
                key={emp.id}
                className="flex items-center justify-between p-3 bg-secondary rounded-lg"
              >
                <div>
                  <p className="font-medium">{emp.name}</p>
                  <p className="text-xs text-muted-foreground">
                    ຄ່າແຮງ: {emp.hourlyRate.toLocaleString()}/ຊມ
                  </p>
                </div>
                <button
                  onClick={() => onDeleteEmployee(emp.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Database Management */}
      <div className="card-luxury rounded-xl p-6">
        <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5" />
          ສຳຮອງຂໍ້ມູນ
        </h3>

        <p className="text-sm text-muted-foreground mb-4">ສົ່ງອອກຂໍ້ມູນທຸລະກິດເປັນໄຟລ໌ JSON</p>

        <Button onClick={onExportData} className="w-full bg-secondary hover:bg-secondary/80 gap-2">
          <Download className="w-4 h-4" />
          ສົ່ງອອກຂໍ້ມູນ
        </Button>
      </div>
    </div>
  );
}
