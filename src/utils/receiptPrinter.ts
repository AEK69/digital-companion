import jsPDF from 'jspdf';
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
  return {
    date: date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }),
    time: date.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
};

// Generate POS Receipt PDF (Thermal printer format - 80mm or 58mm)
export const generatePOSReceiptPDF = (data: ReceiptData, paperWidth: 80 | 58 = 80) => {
  const { sale, items, employee, storeInfo, receivedAmount, changeAmount, customer, pointsDiscount } = data;
  
  // Calculate receipt height based on items
  const baseHeight = 120;
  const itemHeight = items.length * 6;
  const totalHeight = baseHeight + itemHeight;
  
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [paperWidth, Math.max(totalHeight, 100)],
  });

  const pageWidth = paperWidth;
  const margin = 3;
  const contentWidth = pageWidth - (margin * 2);
  let y = 8;

  // Helper function to draw dashed line
  const drawDashedLine = (yPos: number) => {
    doc.setLineDashPattern([1, 1], 0);
    doc.setLineWidth(0.1);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    doc.setLineDashPattern([], 0);
  };

  // === HEADER ===
  doc.setFontSize(paperWidth === 80 ? 14 : 12);
  doc.setFont('helvetica', 'bold');
  doc.text(storeInfo.name, pageWidth / 2, y, { align: 'center' });
  
  y += 5;
  doc.setFontSize(paperWidth === 80 ? 8 : 7);
  doc.setFont('helvetica', 'normal');
  
  if (storeInfo.address) {
    doc.text(storeInfo.address, pageWidth / 2, y, { align: 'center' });
    y += 3.5;
  }
  if (storeInfo.phone) {
    doc.text(`ໂທ: ${storeInfo.phone}`, pageWidth / 2, y, { align: 'center' });
    y += 3.5;
  }

  // === DIVIDER ===
  y += 1;
  drawDashedLine(y);
  y += 4;

  // === RECEIPT INFO ===
  const { date, time } = formatDateTime(sale.created_at);
  
  doc.setFontSize(paperWidth === 80 ? 9 : 8);
  doc.setFont('helvetica', 'bold');
  doc.text('ໃບບິນ', pageWidth / 2, y, { align: 'center' });
  y += 4;
  
  doc.setFontSize(paperWidth === 80 ? 8 : 7);
  doc.setFont('helvetica', 'normal');
  doc.text(`ເລກທີ: ${sale.sale_number}`, margin, y);
  y += 3.5;
  doc.text(`ວັນທີ: ${date}`, margin, y);
  doc.text(`ເວລາ: ${time}`, pageWidth - margin, y, { align: 'right' });
  y += 3.5;
  doc.text(`ພະນັກງານ: ${employee?.name || '-'}`, margin, y);
  y += 3.5;
  if (customer) {
    doc.text(`ລູກຄ້າ: ${customer.name}`, margin, y);
    y += 3.5;
  }
  doc.text(`ຊຳລະ: ${getPaymentMethodLabel(sale.payment_method)}`, margin, y);

  // === DIVIDER ===
  y += 2;
  drawDashedLine(y);
  y += 4;

  // === ITEMS TABLE HEADER ===
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(paperWidth === 80 ? 8 : 7);
  doc.text('ລາຍການ', margin, y);
  doc.text('ຈຳນວນ', pageWidth / 2, y, { align: 'center' });
  doc.text('ລວມ', pageWidth - margin, y, { align: 'right' });
  y += 1;
  drawDashedLine(y);
  y += 3;

  // === ITEMS ===
  doc.setFont('helvetica', 'normal');
  items.forEach(item => {
    // Product name (may wrap)
    const name = item.product_name.length > 15 
      ? item.product_name.substring(0, 15) + '...' 
      : item.product_name;
    
    doc.text(name, margin, y);
    doc.text(`${item.quantity}x₭${formatNumber(item.unit_price)}`, pageWidth / 2, y, { align: 'center' });
    doc.text(`₭${formatNumber(item.total_price)}`, pageWidth - margin, y, { align: 'right' });
    y += 4;
  });

  // === DIVIDER ===
  drawDashedLine(y);
  y += 4;

  // === TOTALS ===
  doc.setFontSize(paperWidth === 80 ? 8 : 7);
  doc.text('ລວມທັງໝົດ:', margin, y);
  doc.text(`₭${formatNumber(sale.total_amount)}`, pageWidth - margin, y, { align: 'right' });
  y += 4;

  if (sale.discount_amount > 0) {
    if (pointsDiscount && pointsDiscount > 0) {
      const regularDiscount = sale.discount_amount - pointsDiscount;
      if (regularDiscount > 0) {
        doc.text('ສ່ວນຫຼຸດ:', margin, y);
        doc.text(`-₭${formatNumber(regularDiscount)}`, pageWidth - margin, y, { align: 'right' });
        y += 4;
      }
      doc.text('ສ່ວນຫຼຸດຈາກຄະແນນ:', margin, y);
      doc.text(`-₭${formatNumber(pointsDiscount)}`, pageWidth - margin, y, { align: 'right' });
      y += 4;
    } else {
      doc.text('ສ່ວນຫຼຸດ:', margin, y);
      doc.text(`-₭${formatNumber(sale.discount_amount)}`, pageWidth - margin, y, { align: 'right' });
      y += 4;
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(paperWidth === 80 ? 10 : 9);
  doc.text('ຍອດສຸດທິ:', margin, y);
  doc.text(`₭${formatNumber(sale.final_amount)}`, pageWidth - margin, y, { align: 'right' });
  y += 5;

  // Payment info if cash
  if (sale.payment_method === 'cash' && receivedAmount !== undefined) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(paperWidth === 80 ? 8 : 7);
    doc.text('ເງິນທີ່ຮັບ:', margin, y);
    doc.text(`₭${formatNumber(receivedAmount)}`, pageWidth - margin, y, { align: 'right' });
    y += 4;
    doc.text('ເງິນທອນ:', margin, y);
    doc.text(`₭${formatNumber(changeAmount || 0)}`, pageWidth - margin, y, { align: 'right' });
    y += 4;
  }

  // === FOOTER ===
  y += 2;
  drawDashedLine(y);
  y += 4;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(paperWidth === 80 ? 7 : 6);
  doc.text('ຂອບໃຈທີ່ອຸດໜູນ!', pageWidth / 2, y, { align: 'center' });
  y += 3;
  doc.text('Thank you for your purchase!', pageWidth / 2, y, { align: 'center' });

  return doc;
};

// Get payment method label
const getPaymentMethodLabel = (method: string) => {
  switch (method) {
    case 'cash': return 'ເງິນສົດ';
    case 'transfer': return 'ໂອນ';
    case 'qr': return 'QR Code';
    default: return method;
  }
};

// Print receipt - opens print dialog
export const printReceipt = async (data: ReceiptData, paperWidth: 80 | 58 = 80) => {
  const doc = generatePOSReceiptPDF(data, paperWidth);
  
  // Open PDF in new window for printing
  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  
  const printWindow = window.open(pdfUrl, '_blank');
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.print();
    };
  }
  
  return doc;
};

// Download receipt as PDF
export const downloadReceipt = (data: ReceiptData, paperWidth: 80 | 58 = 80) => {
  const doc = generatePOSReceiptPDF(data, paperWidth);
  doc.save(`receipt-${data.sale.sale_number}.pdf`);
  return doc;
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
  
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [paperWidth, 100 + (items.length * 6)],
  });

  const pageWidth = paperWidth;
  const margin = 3;
  let y = 8;

  // Header
  doc.setFontSize(paperWidth === 80 ? 14 : 12);
  doc.setFont('helvetica', 'bold');
  doc.text(storeInfo.name, pageWidth / 2, y, { align: 'center' });
  y += 8;

  // Preview label
  doc.setFontSize(paperWidth === 80 ? 9 : 8);
  doc.text('** ຕົວຢ່າງໃບບິນ **', pageWidth / 2, y, { align: 'center' });
  y += 6;

  // Items
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(paperWidth === 80 ? 8 : 7);
  items.forEach(item => {
    const name = item.product_name.length > 15 
      ? item.product_name.substring(0, 15) + '...' 
      : item.product_name;
    doc.text(name, margin, y);
    doc.text(`${item.quantity}x₭${formatNumber(item.unit_price)}`, pageWidth / 2, y, { align: 'center' });
    doc.text(`₭${formatNumber(item.total_price)}`, pageWidth - margin, y, { align: 'right' });
    y += 4;
  });

  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.text('ຍອດສຸດທິ:', margin, y);
  doc.text(`₭${formatNumber(finalAmount)}`, pageWidth - margin, y, { align: 'right' });

  return doc;
};
