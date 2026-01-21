import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// EMV QR Code specification for LAO payments
function generateEMVQRCode(amount: number, merchantInfo: {
  merchantId: string;
  merchantName: string;
  city: string;
  reference: string;
}): string {
  // Base QR string from merchant account
  const baseQR = '00020101021115312738041800520446mch19B73F61B9E038570016A00526628466257701082771041802030020314mch19B73F61B9E5204569153034185802LA5916AKAPHON XAYYABED6002VT';
  
  // Build EMV QR code components
  let qrData = '';
  
  // Payload Format Indicator (ID 00)
  qrData += '000201';
  
  // Point of Initiation Method (ID 01) - 12 = Dynamic
  qrData += '010212';
  
  // Merchant Account Information (ID 15) - BCEL OnePay
  const merchantAcct = `041800520446mch19B73F61B9E038570016A00526628466257701082771041802030020314mch19B73F61B9E`;
  qrData += `1531${merchantAcct}`;
  
  // Merchant Category Code (ID 52)
  qrData += '52045691';
  
  // Transaction Currency (ID 53) - LAK = 418
  qrData += '5303418';
  
  // Transaction Amount (ID 54)
  const amountStr = amount.toString();
  const amountLen = amountStr.length.toString().padStart(2, '0');
  qrData += `54${amountLen}${amountStr}`;
  
  // Country Code (ID 58)
  qrData += '5802LA';
  
  // Merchant Name (ID 59)
  const name = merchantInfo.merchantName.substring(0, 25);
  const nameLen = name.length.toString().padStart(2, '0');
  qrData += `59${nameLen}${name}`;
  
  // Merchant City (ID 60)
  const city = merchantInfo.city.substring(0, 15);
  const cityLen = city.length.toString().padStart(2, '0');
  qrData += `60${cityLen}${city}`;
  
  // Additional Data Field (ID 62) - Reference/Invoice
  const ref = merchantInfo.reference.substring(0, 20);
  const refLen = ref.length.toString().padStart(2, '0');
  const additionalData = `05${refLen}${ref}`;
  const additionalLen = additionalData.length.toString().padStart(2, '0');
  qrData += `62${additionalLen}${additionalData}`;
  
  // CRC placeholder (ID 63)
  qrData += '6304';
  
  // Calculate CRC16-CCITT
  const crc = calculateCRC16(qrData);
  qrData += crc;
  
  return qrData;
}

// CRC16-CCITT calculation
function calculateCRC16(str: string): string {
  let crc = 0xFFFF;
  const polynomial = 0x1021;
  
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ polynomial;
      } else {
        crc <<= 1;
      }
    }
    crc &= 0xFFFF;
  }
  
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { amount, reference, description, bankType } = await req.json();

    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Amount is required and must be positive' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const secretKey = Deno.env.get('PHAJAY_SECRET_KEY');
    const apiUrl = Deno.env.get('PHAJAY_API_URL');
    
    let qrCodeData: string;
    let qrImageUrl: string;
    let transactionId: string | null = null;

    // If Phajay API is configured, use it
    if (secretKey && apiUrl) {
      console.log('Using Phajay API for QR generation');
      
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'secretKey': secretKey,
          },
          body: JSON.stringify({
            amount: amount,
            description: description || `Payment - ${reference}`,
            reference: reference,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Phajay API response:', data);
          
          if (data.qrCode) {
            return new Response(
              JSON.stringify({
                success: true,
                qrCode: data.qrCode,
                qrData: data.link || null,
                transactionId: data.transactionId,
                amount,
                reference,
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } else {
          console.error('Phajay API error:', await response.text());
        }
      } catch (apiError) {
        console.error('Phajay API call failed:', apiError);
      }
    }

    // Fallback: Generate EMV QR code locally
    console.log('Generating local EMV QR code');
    
    const invoiceRef = reference || `INV-${Date.now().toString().slice(-8)}`;
    
    qrCodeData = generateEMVQRCode(amount, {
      merchantId: 'mch19B73F61B9E',
      merchantName: 'AKAPHON XAYYABED',
      city: 'VT',
      reference: invoiceRef,
    });
    
    // Generate QR image URL using public QR service
    qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&ecc=H&data=${encodeURIComponent(qrCodeData)}`;

    return new Response(
      JSON.stringify({
        success: true,
        qrCode: qrImageUrl,
        qrData: qrCodeData,
        transactionId: null,
        amount,
        reference: invoiceRef,
        bankType: bankType || 'bcel',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('Generate QR error:', err);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
