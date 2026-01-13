import { useState } from 'react';
import { Settings, Store, Users, Plus, Trash2, Save, AlertTriangle, Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Employee, StoreInfo, Income, Expense, Attendance, Leave } from '@/types';

interface SettingsTabProps {
  storeInfo: StoreInfo;
  employees: Employee[];
  onUpdateStoreInfo: (info: StoreInfo) => void;
  onAddEmployee: (employee: Omit<Employee, 'id'>) => void;
  onDeleteEmployee: (id: string) => void;
  onExportData: () => void;
  onImportData: (data: string) => void;
  onClearAllData: () => void;
}

export function SettingsTab({
  storeInfo,
  employees,
  onUpdateStoreInfo,
  onAddEmployee,
  onDeleteEmployee,
  onExportData,
  onImportData,
  onClearAllData,
}: SettingsTabProps) {
  const [storeName, setStoreName] = useState(storeInfo.name);
  const [storePhone, setStorePhone] = useState(storeInfo.phone || '');
  const [storeAddress, setStoreAddress] = useState(storeInfo.address || '');

  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [newEmployeeRate, setNewEmployeeRate] = useState('');

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleSaveStore = () => {
    onUpdateStoreInfo({
      ...storeInfo,
      name: storeName,
      phone: storePhone,
      address: storeAddress,
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

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const data = event.target?.result as string;
          onImportData(data);
        };
        reader.readAsText(file);
      }
    };
    input.click();
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
          {employees.map((emp) => (
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
          ))}
        </div>
      </div>

      {/* Database Management */}
      <div className="card-luxury rounded-xl p-6">
        <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5" />
          ຈັດການຖານຂໍ້ມູນ
        </h3>

        <p className="text-sm text-muted-foreground mb-4">ສຳຮອງ ແລະ ກູ້ຄືນຂໍ້ມູນທຸລະກິດ</p>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <Button onClick={onExportData} className="bg-secondary hover:bg-secondary/80 gap-2">
            <Download className="w-4 h-4" />
            ສົ່ງອອກ
          </Button>
          <Button onClick={handleImport} className="bg-secondary hover:bg-secondary/80 gap-2">
            <Upload className="w-4 h-4" />
            ນຳເຂົ້າ
          </Button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card-luxury rounded-xl p-6 border-destructive/30">
        <h3 className="text-lg font-semibold text-destructive mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          ເຂດອັນຕະລາຍ
        </h3>

        {!showClearConfirm ? (
          <Button
            onClick={() => setShowClearConfirm(true)}
            variant="destructive"
            className="w-full"
          >
            ລຶບລ້າງຂໍ້ມູນທັງໝົດ
          </Button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              ທ່ານແນ່ໃຈບໍ? ຂໍ້ມູນທັງໝົດຈະຖືກລຶບຖາວອນ!
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={onClearAllData} variant="destructive">
                ຢືນຢັນລຶບ
              </Button>
              <Button onClick={() => setShowClearConfirm(false)} variant="outline">
                ຍົກເລີກ
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
