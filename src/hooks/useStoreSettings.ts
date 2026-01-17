import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { StoreInfo } from '@/types';
import { toast } from 'sonner';

interface StoreSettings {
  id: string;
  name: string;
  logo: string | null;
  address: string | null;
  phone: string | null;
  google_spreadsheet_id: string | null;
  auto_sync_enabled: boolean;
}

const defaultSettings: StoreInfo & { 
  googleSpreadsheetId: string | null; 
  autoSyncEnabled: boolean;
} = {
  name: 'ຮ້ານຂອງຂ້ອຍ',
  logo: undefined,
  address: undefined,
  phone: undefined,
  googleSpreadsheetId: null,
  autoSyncEnabled: false,
};

export function useStoreSettings() {
  const [storeSettings, setStoreSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [settingsId, setSettingsId] = useState<string | null>(null);

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('store_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettingsId(data.id);
        setStoreSettings({
          name: data.name,
          logo: data.logo || undefined,
          address: data.address || undefined,
          phone: data.phone || undefined,
          googleSpreadsheetId: data.google_spreadsheet_id,
          autoSyncEnabled: data.auto_sync_enabled,
        });
      }
    } catch (error) {
      console.error('Error fetching store settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Update settings
  const updateSettings = useCallback(async (updates: Partial<typeof defaultSettings>) => {
    try {
      const dbUpdates: Partial<StoreSettings> = {};
      
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.logo !== undefined) dbUpdates.logo = updates.logo || null;
      if (updates.address !== undefined) dbUpdates.address = updates.address || null;
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone || null;
      if (updates.googleSpreadsheetId !== undefined) dbUpdates.google_spreadsheet_id = updates.googleSpreadsheetId;
      if (updates.autoSyncEnabled !== undefined) dbUpdates.auto_sync_enabled = updates.autoSyncEnabled;

      if (settingsId) {
        // Update existing
        const { error } = await supabase
          .from('store_settings')
          .update(dbUpdates)
          .eq('id', settingsId);

        if (error) throw error;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('store_settings')
          .insert([{ ...dbUpdates, name: dbUpdates.name || defaultSettings.name }])
          .select()
          .single();

        if (error) throw error;
        if (data) setSettingsId(data.id);
      }

      setStoreSettings(prev => ({ ...prev, ...updates }));
      toast.success('ບັນທຶກການຕັ້ງຄ່າສຳເລັດ');
    } catch (error) {
      console.error('Error updating store settings:', error);
      toast.error('ເກີດຂໍ້ຜິດພາດໃນການບັນທຶກ');
    }
  }, [settingsId]);

  return {
    storeSettings,
    loading,
    updateSettings,
    refetch: fetchSettings,
  };
}
