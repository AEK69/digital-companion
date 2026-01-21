import { CartItem, Sale, SaleItem } from '@/hooks/useSales';
import { StoreInfo, Employee } from '@/types';
import { Customer } from '@/hooks/useCustomers';

interface ReceiptData {
  sale: Sale;
  items: SaleItem[];
  employee?: Employee;
  storeInfo: StoreInfo;
  receivedAmount?: number;
  changeAmount?: number;
  customer?: Customer;
  pointsDiscount?: number;
}

// Format number with comma
const formatNumber = (num: number) => num.toLocaleString('en-US');

// Format date/time
const formatDateTime = (dateStr: string) => {
  const date = new Date(dateStr);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  
  return {
    date: `${day}/${month}/${year}`,
    time: `${hours}:${minutes}:${seconds}`,
  };
};

// Get payment method label in Lao
const getPaymentMethodLabel = (method: string) => {
  switch (method) {
    case 'cash': return 'ເງິນສົດ';
    case 'transfer': return 'ໂອນເງິນ';
    case 'qr': return 'QR Code';
    default: return method;
  }
};

// Generate HTML Receipt that supports Lao font
const generateReceiptHTML = (data: ReceiptData): string => {
  const { sale, items, employee, storeInfo, receivedAmount, changeAmount, customer, pointsDiscount } = data;
  const { date, time } = formatDateTime(sale.created_at);
  
  // Build items HTML
  const itemsHTML = items.map((item, index) => `
    <tr>
      <td style="padding: 4px 0; text-align: left; border-bottom: 1px dashed #ddd;">
        ${index + 1}. ${item.product_name}
      </td>
      <td style="padding: 4px 0; text-align: center; border-bottom: 1px dashed #ddd;">
        ${item.quantity}
      </td>
      <td style="padding: 4px 0; text-align: right; border-bottom: 1px dashed #ddd;">
        ${formatNumber(item.unit_price)}
      </td>
      <td style="padding: 4px 0; text-align: right; border-bottom: 1px dashed #ddd;">
        ${formatNumber(item.total_price)}
      </td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>ໃບບິນ - ${sale.sale_number}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Lao:wght@400;600;700&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Noto Sans Lao', 'Phetsarath OT', Arial, sans-serif;
          font-size: 12px;
          line-height: 1.4;
          background: white;
          padding: 10px;
          width: 80mm;
          max-width: 80mm;
        }
        
        .receipt {
          width: 100%;
        }
        
        .header {
          text-align: center;
          padding-bottom: 10px;
          border-bottom: 2px dashed #333;
        }
        
        .store-name {
          font-size: 18px;
          font-weight: 700;
          margin-bottom: 5px;
        }
        
        .store-info {
          font-size: 11px;
          color: #555;
        }
        
        .receipt-title {
          text-align: center;
          font-size: 14px;
          font-weight: 700;
          margin: 10px 0;
          padding: 5px;
          background: #f5f5f5;
        }
        
        .info-section {
          padding: 10px 0;
          border-bottom: 1px dashed #333;
        }
        
        .info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 3px;
          font-size: 11px;
        }
        
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin: 10px 0;
          font-size: 11px;
        }
        
        .items-table th {
          text-align: left;
          padding: 5px 0;
          border-bottom: 2px solid #333;
          font-weight: 600;
        }
        
        .items-table th:nth-child(2),
        .items-table th:nth-child(3),
        .items-table th:nth-child(4) {
          text-align: center;
        }
        
        .items-table th:last-child {
          text-align: right;
        }
        
        .totals-section {
          padding: 10px 0;
          border-top: 2px dashed #333;
        }
        
        .total-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
          font-size: 12px;
        }
        
        .total-row.grand-total {
          font-size: 16px;
          font-weight: 700;
          padding: 8px 0;
          border-top: 1px solid #333;
          border-bottom: 1px solid #333;
          margin-top: 5px;
        }
        
        .payment-info {
          padding: 10px 0;
          background: #f9f9f9;
          margin: 10px 0;
          padding: 10px;
          border-radius: 5px;
        }
        
        .qr-section {
          text-align: center;
          padding: 15px 0;
          border-top: 1px dashed #333;
        }
        
        .qr-title {
          font-weight: 600;
          margin-bottom: 10px;
        }
        
        .loyalty-section {
          text-align: center;
          padding: 10px;
          background: #fff3e0;
          border-radius: 5px;
          margin: 10px 0;
          font-size: 11px;
        }
        
        .footer {
          text-align: center;
          padding: 15px 0;
          border-top: 2px dashed #333;
        }
        
        .thank-you {
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 5px;
        }
        
        .sub-text {
          font-size: 11px;
          color: #666;
        }
        
        @media print {
          body {
            width: 80mm;
            padding: 5px;
          }
          
          @page {
            size: 80mm auto;
            margin: 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="receipt">
        <!-- Header -->
        <div class="header">
          <div class="store-name">${storeInfo.name}</div>
          ${storeInfo.address ? `<div class="store-info">${storeInfo.address}</div>` : ''}
          ${storeInfo.phone ? `<div class="store-info">ໂທ: ${storeInfo.phone}</div>` : ''}
        </div>
        
        <!-- Receipt Title -->
        <div class="receipt-title">ໃບບິນຂາຍ</div>
        
        <!-- Info Section -->
        <div class="info-section">
          <div class="info-row">
            <span>ເລກທີ່:</span>
            <span>${sale.sale_number}</span>
          </div>
          <div class="info-row">
            <span>ວັນທີ:</span>
            <span>${date}</span>
          </div>
          <div class="info-row">
            <span>ເວລາ:</span>
            <span>${time}</span>
          </div>
          ${employee ? `
          <div class="info-row">
            <span>ພະນັກງານ:</span>
            <span>${employee.name}</span>
          </div>
          ` : ''}
          ${customer ? `
          <div class="info-row">
            <span>ລູກຄ້າ:</span>
            <span>${customer.name}</span>
          </div>
          ${customer.phone ? `
          <div class="info-row">
            <span>ເບີໂທ:</span>
            <span>${customer.phone}</span>
          </div>
          ` : ''}
          ` : ''}
          <div class="info-row">
            <span>ວິທີຊຳລະ:</span>
            <span>${getPaymentMethodLabel(sale.payment_method)}</span>
          </div>
        </div>
        
        <!-- Items Table -->
        <table class="items-table">
          <thead>
            <tr>
              <th>ລາຍການສິນຄ້າ</th>
              <th>ຈຳນວນ</th>
              <th>ລາຄາ</th>
              <th>ລວມ</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>
        
        <!-- Totals Section -->
        <div class="totals-section">
          <div class="total-row">
            <span>ລວມທັງໝົດ:</span>
            <span>₭${formatNumber(sale.total_amount)}</span>
          </div>
          ${sale.discount_amount > 0 ? `
          ${pointsDiscount && pointsDiscount > 0 ? `
            ${sale.discount_amount - pointsDiscount > 0 ? `
            <div class="total-row">
              <span>ສ່ວນຫຼຸດ:</span>
              <span>-₭${formatNumber(sale.discount_amount - pointsDiscount)}</span>
            </div>
            ` : ''}
            <div class="total-row">
              <span>ສ່ວນຫຼຸດຄະແນນສະສົມ:</span>
              <span>-₭${formatNumber(pointsDiscount)}</span>
            </div>
          ` : `
            <div class="total-row">
              <span>ສ່ວນຫຼຸດ:</span>
              <span>-₭${formatNumber(sale.discount_amount)}</span>
            </div>
          `}
          ` : ''}
          <div class="total-row grand-total">
            <span>ຍອດສຸດທິ:</span>
            <span>₭${formatNumber(sale.final_amount)}</span>
          </div>
        </div>
        
        <!-- Payment Info for Cash -->
        ${sale.payment_method === 'cash' && receivedAmount !== undefined ? `
        <div class="payment-info">
          <div class="total-row">
            <span>ເງິນທີ່ຮັບ:</span>
            <span>₭${formatNumber(receivedAmount)}</span>
          </div>
          <div class="total-row" style="font-weight: 700; color: #16a34a;">
            <span>ເງິນທອນ:</span>
            <span>₭${formatNumber(changeAmount || 0)}</span>
          </div>
        </div>
        ` : ''}
        
        <!-- Loyalty Points -->
        ${customer ? `
        <div class="loyalty-section">
          <div>ຄະແນນສະສົມໃໝ່: <strong>${customer.loyalty_points - (pointsDiscount ? Math.ceil(pointsDiscount / 100) : 0) + Math.floor(sale.final_amount / 10000)}</strong> ຄະແນນ</div>
          <div style="font-size: 10px; color: #666;">(ທຸກ ₭10,000 = 1 ຄະແນນ)</div>
        </div>
        ` : ''}
        
        <!-- Footer -->
        <div class="footer">
          <div class="thank-you">ຂອບໃຈທີ່ອຸດໜູນ!</div>
          <div class="sub-text">ຍິນດີຕ້ອນຮັບຄັ້ງຕໍ່ໄປ</div>
        </div>
      </div>
      
      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `;
};

// Print receipt - opens print dialog with HTML
export const printReceipt = async (data: ReceiptData, paperWidth: 80 | 58 = 80, showQR: boolean = true) => {
  const html = generateReceiptHTML(data);
  
  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
};

// Download receipt as HTML file
export const downloadReceipt = (data: ReceiptData, paperWidth: 80 | 58 = 80, showQR: boolean = true) => {
  const html = generateReceiptHTML(data);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `receipt-${data.sale.sale_number}.html`;
  a.click();
  URL.revokeObjectURL(url);
};

// Generate receipt for cart items before sale is completed (preview)
export const generateCartReceiptPreview = (
  items: CartItem[],
  storeInfo: StoreInfo,
  discountAmount: number = 0,
  paperWidth: 80 | 58 = 80
) => {
  const totalAmount = items.reduce((sum, item) => sum + item.total_price, 0);
  const finalAmount = totalAmount - discountAmount;
  
  const itemsHTML = items.map((item, index) => `
    <tr>
      <td>${index + 1}. ${item.product_name}</td>
      <td>${item.quantity}x${formatNumber(item.unit_price)}</td>
      <td>₭${formatNumber(item.total_price)}</td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>ຕົວຢ່າງໃບບິນ</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Lao:wght@400;600;700&display=swap');
        body {
          font-family: 'Noto Sans Lao', Arial, sans-serif;
          font-size: 12px;
          padding: 15px;
          width: 80mm;
        }
        .header {
          text-align: center;
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 10px;
        }
        .preview-label {
          text-align: center;
          background: #fff3cd;
          padding: 5px;
          margin-bottom: 10px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        td {
          padding: 3px;
          border-bottom: 1px dashed #ddd;
        }
        .total {
          font-weight: bold;
          font-size: 14px;
          margin-top: 10px;
          text-align: right;
        }
      </style>
    </head>
    <body>
      <div class="header">${storeInfo.name}</div>
      <div class="preview-label">** ຕົວຢ່າງໃບບິນ **</div>
      <table>
        ${itemsHTML}
      </table>
      <div class="total">ຍອດສຸດທິ: ₭${formatNumber(finalAmount)}</div>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank', 'width=400,height=400');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
};
