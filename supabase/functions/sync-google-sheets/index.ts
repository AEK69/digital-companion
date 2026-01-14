import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.8/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Google Sheets API utilities
async function getGoogleAccessToken(): Promise<string> {
  const serviceAccountEmail = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL');
  const privateKeyPem = Deno.env.get('GOOGLE_PRIVATE_KEY');

  if (!serviceAccountEmail || !privateKeyPem) {
    throw new Error('Google service account credentials not configured');
  }

  // Parse the private key
  const privateKey = privateKeyPem.replace(/\\n/g, '\n');
  
  // Create JWT for Google OAuth
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccountEmail,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  // Import the private key
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = privateKey
    .replace(pemHeader, '')
    .replace(pemFooter, '')
    .replace(/\s/g, '');
  
  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    true,
    ["sign"]
  );

  // Create JWT
  const jwt = await create(
    { alg: "RS256", typ: "JWT" },
    payload,
    cryptoKey
  );

  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const tokenData = await tokenResponse.json();
  
  if (!tokenData.access_token) {
    console.error('Token response:', tokenData);
    throw new Error('Failed to get Google access token');
  }

  return tokenData.access_token;
}

async function updateSheet(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  data: unknown[][]
) {
  const range = `${sheetName}!A1`;
  
  // Clear existing data first
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}:clear`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  // Update with new data
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: data,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error(`Failed to update sheet ${sheetName}:`, error);
    throw new Error(`Failed to update sheet ${sheetName}`);
  }

  return response.json();
}

function formatDataForSheet(type: string, data: unknown[]): unknown[][] {
  if (data.length === 0) return [['ບໍ່ມີຂໍ້ມູນ']];

  switch (type) {
    case 'incomes':
      return [
        ['ວັນທີ', 'ພະນັກງານ', 'ປະເພດ', 'ລາຍລະອຽດ', 'ຈຳນວນເງິນ', 'ຕົ້ນທຶນ', 'ກຳໄລ', 'ວິທີຊຳລະ'],
        ...data.map((i: any) => [
          i.date,
          i.employeeName,
          i.type === 'service' ? 'ບໍລິການ' : 'ຂາຍສິນຄ້າ',
          i.description,
          i.amount,
          i.cost,
          i.amount - i.cost,
          i.paymentMethod,
        ]),
      ];

    case 'expenses':
      return [
        ['ວັນທີ', 'ພະນັກງານ', 'ປະເພດ', 'ລາຍລະອຽດ', 'ຈຳນວນເງິນ', 'ວິທີຊຳລະ'],
        ...data.map((e: any) => [
          e.date,
          e.employeeName,
          e.type,
          e.description,
          e.amount,
          e.paymentMethod,
        ]),
      ];

    case 'attendances':
      return [
        ['ວັນທີ', 'ພະນັກງານ', 'ເຂົ້າວຽກ', 'ອອກວຽກ', 'ຊົ່ວໂມງ', 'ຄ່າແຮງ', 'ໂບນັດ', 'ລວມ'],
        ...data.map((a: any) => [
          a.date,
          a.employeeName,
          a.clockIn || '-',
          a.clockOut || '-',
          a.hours?.toFixed(2) || '0',
          a.wage || 0,
          a.bonus || 0,
          a.total || 0,
        ]),
      ];

    case 'leaves':
      return [
        ['ວັນທີ', 'ພະນັກງານ', 'ປະເພດການລາ', 'ເຫດຜົນ'],
        ...data.map((l: any) => {
          const typeMap: Record<string, string> = {
            general: 'ລາທົ່ວໄປ',
            vacation: 'ລາພັກຜ່ອນ',
            sick: 'ລາປ່ວຍ',
          };
          return [l.date, l.employeeName, typeMap[l.type] || l.type, l.reason || '-'];
        }),
      ];

    case 'employees':
      return [
        ['ຊື່', 'ຄ່າແຮງ/ຊົ່ວໂມງ'],
        ...data.map((e: any) => [e.name, e.hourlyRate]),
      ];

    default:
      return [['ບໍ່ມີຂໍ້ມູນ']];
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { spreadsheetId, data } = await req.json();

    if (!spreadsheetId) {
      return new Response(
        JSON.stringify({ error: 'Spreadsheet ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting Google Sheets sync...');
    console.log('Spreadsheet ID:', spreadsheetId);

    // Get access token
    const accessToken = await getGoogleAccessToken();
    console.log('Got access token');

    // Update each sheet
    const sheets = ['incomes', 'expenses', 'attendances', 'leaves', 'employees'];
    const results: Record<string, string> = {};

    for (const sheet of sheets) {
      try {
        const sheetData = data[sheet] || [];
        const formattedData = formatDataForSheet(sheet, sheetData);
        await updateSheet(accessToken, spreadsheetId, sheet, formattedData);
        results[sheet] = 'success';
        console.log(`Updated sheet: ${sheet}`);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`Error updating ${sheet}:`, err);
        results[sheet] = `error: ${errorMessage}`;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Sync completed',
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('Sync error:', err);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});