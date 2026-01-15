import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to base64url encode
function base64urlEncode(data: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Helper function to create JWT manually without external library
async function createJWT(payload: Record<string, unknown>, privateKey: CryptoKey): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" };
  
  const encoder = new TextEncoder();
  const headerB64 = base64urlEncode(encoder.encode(JSON.stringify(header)));
  const payloadB64 = base64urlEncode(encoder.encode(JSON.stringify(payload)));
  
  const signatureInput = `${headerB64}.${payloadB64}`;
  const signatureInputBytes = encoder.encode(signatureInput);
  
  const signature = await crypto.subtle.sign(
    { name: "RSASSA-PKCS1-v1_5" },
    privateKey,
    signatureInputBytes
  );
  
  const signatureB64 = base64urlEncode(new Uint8Array(signature));
  
  return `${headerB64}.${payloadB64}.${signatureB64}`;
}

// Google Sheets API utilities
async function getGoogleAccessToken(): Promise<string> {
  const serviceAccountEmail = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL');
  const privateKeyPem = Deno.env.get('GOOGLE_PRIVATE_KEY');

  if (!serviceAccountEmail || !privateKeyPem) {
    throw new Error('Google service account credentials not configured. Please add GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY secrets.');
  }

  console.log('Service account email:', serviceAccountEmail);

  // Parse the private key - handle various formats
  let privateKey = privateKeyPem;
  
  // Replace literal \n with actual newlines
  privateKey = privateKey.replace(/\\n/g, '\n');
  
  // If the key is wrapped in quotes, remove them
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.slice(1, -1);
  }
  
  console.log('Private key starts with:', privateKey.substring(0, 50));
  
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
  
  // Extract the base64 content between headers
  const pemStartIndex = privateKey.indexOf(pemHeader);
  const pemEndIndex = privateKey.indexOf(pemFooter);
  
  if (pemStartIndex === -1 || pemEndIndex === -1) {
    console.error('Invalid private key format - missing PEM headers');
    console.error('Key preview:', privateKey.substring(0, 100));
    throw new Error('Invalid private key format - missing PEM headers. Make sure to include the full private key from the JSON file.');
  }
  
  const pemContents = privateKey
    .substring(pemStartIndex + pemHeader.length, pemEndIndex)
    .replace(/\s/g, '');
  
  console.log('PEM contents length:', pemContents.length);
  
  try {
    const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
    
    const cryptoKey = await crypto.subtle.importKey(
      "pkcs8",
      binaryDer,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      true,
      ["sign"]
    );

    // Create JWT using our helper function
    const jwt = await createJWT(payload, cryptoKey);

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
      console.error('Token response:', JSON.stringify(tokenData));
      throw new Error(`Failed to get Google access token: ${tokenData.error_description || tokenData.error || 'Unknown error'}`);
    }

    return tokenData.access_token;
  } catch (error) {
    console.error('Error importing private key:', error);
    throw new Error(`Failed to import private key: ${error instanceof Error ? error.message : String(error)}. Please ensure the GOOGLE_PRIVATE_KEY secret contains the full private key from your service account JSON file.`);
  }
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

// Extract spreadsheet ID from URL or return ID as-is
function extractSpreadsheetId(input: string): string {
  // If it's a full URL, extract the ID
  const urlMatch = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch) {
    return urlMatch[1];
  }
  // Otherwise assume it's already just the ID
  return input.trim();
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { spreadsheetId: rawSpreadsheetId, data } = await req.json();

    if (!rawSpreadsheetId) {
      return new Response(
        JSON.stringify({ error: 'Spreadsheet ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract spreadsheet ID from URL if needed
    const spreadsheetId = extractSpreadsheetId(rawSpreadsheetId);

    console.log('Starting Google Sheets sync...');
    console.log('Raw input:', rawSpreadsheetId);
    console.log('Extracted Spreadsheet ID:', spreadsheetId);

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