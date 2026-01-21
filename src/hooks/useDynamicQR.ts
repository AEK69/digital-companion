import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DynamicQRResult {
  success: boolean;
  qrCode: string;
  qrData: string | null;
  transactionId: string | null;
  amount: number;
  reference: string;
  bankType?: string;
}

export function useDynamicQR() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrResult, setQrResult] = useState<DynamicQRResult | null>(null);

  const generateQR = useCallback(async (
    amount: number,
    reference?: string,
    description?: string,
    bankType: 'bcel' | 'ldb' | 'jdb' = 'bcel'
  ): Promise<DynamicQRResult | null> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('generate-payment-qr', {
        body: { 
          amount, 
          reference, 
          description,
          bankType,
        },
      });

      if (invokeError) throw invokeError;

      if (data?.success) {
        setQrResult(data);
        return data;
      } else {
        throw new Error(data?.error || 'Failed to generate QR code');
      }
    } catch (err: any) {
      console.error('QR generation error:', err);
      setError(err.message || 'Failed to generate QR code');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearQR = useCallback(() => {
    setQrResult(null);
    setError(null);
  }, []);

  return {
    loading,
    error,
    qrResult,
    generateQR,
    clearQR,
  };
}
