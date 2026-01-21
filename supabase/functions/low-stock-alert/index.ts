import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LowStockProduct {
  id: string;
  name: string;
  barcode: string | null;
  stock_quantity: number;
  min_stock_level: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    // Parse request body
    const { recipientEmail, storeName } = await req.json();

    if (!recipientEmail) {
      throw new Error("Recipient email is required");
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all active products
    const { data: allProducts, error: queryError } = await supabase
      .from("products")
      .select("id, name, barcode, stock_quantity, min_stock_level")
      .eq("is_active", true);

    if (queryError) {
      console.error("Query error:", queryError);
      throw new Error(`Failed to query products: ${queryError.message}`);
    }

    // Filter products where stock is at or below minimum level
    const alertProducts: LowStockProduct[] = (allProducts || []).filter(
      (p: LowStockProduct) => p.stock_quantity <= p.min_stock_level
    );

    if (alertProducts.length === 0) {
      console.log("No low stock products found");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No low stock products",
          alertCount: 0 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${alertProducts.length} low stock products`);

    // Build email content
    const productRows = alertProducts
      .map(
        (p) =>
          `<tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 12px; text-align: left;">${p.name}</td>
            <td style="padding: 12px; text-align: center;">${p.barcode || "-"}</td>
            <td style="padding: 12px; text-align: center; color: #dc2626; font-weight: bold;">${p.stock_quantity}</td>
            <td style="padding: 12px; text-align: center;">${p.min_stock_level}</td>
          </tr>`
      )
      .join("");

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Low Stock Alert</title>
      </head>
      <body style="font-family: Arial, sans-serif; background-color: #f3f4f6; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <div style="background-color: #dc2626; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">⚠️ Low Stock Alert</h1>
          </div>
          
          <div style="padding: 20px;">
            <p style="color: #374151; font-size: 16px;">
              Store <strong>${storeName || "Your Store"}</strong> has <strong style="color: #dc2626;">${alertProducts.length}</strong> products with low stock:
            </p>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
              <thead>
                <tr style="background-color: #f9fafb;">
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Product</th>
                  <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb;">Barcode</th>
                  <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb;">Stock</th>
                  <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb;">Min Level</th>
                </tr>
              </thead>
              <tbody>
                ${productRows}
              </tbody>
            </table>
            
            <div style="margin-top: 24px; padding: 16px; background-color: #fef2f2; border-radius: 8px; border-left: 4px solid #dc2626;">
              <p style="margin: 0; color: #991b1b; font-size: 14px;">
                ⚡ Please reorder these products soon to avoid stockouts.
              </p>
            </div>
          </div>
          
          <div style="background-color: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #6b7280; font-size: 12px;">
              This email was sent automatically from POS System.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email using Resend API directly
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "POS System <onboarding@resend.dev>",
        to: [recipientEmail],
        subject: `⚠️ Alert: ${alertProducts.length} products with low stock`,
        html: emailHtml,
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Email send error:", emailResult);
      throw new Error(emailResult.message || "Failed to send email");
    }

    console.log("Email sent successfully:", emailResult);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Sent alert to ${recipientEmail}`,
        alertCount: alertProducts.length,
        emailId: emailResult.id
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in low-stock-alert function:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
