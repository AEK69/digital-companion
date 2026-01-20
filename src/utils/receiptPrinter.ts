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

// Format number with comma (Lao format)
const formatNumber = (num: number) => num.toLocaleString('en-US');

// Format date/time in Lao
const formatDateTime = (dateStr: string) => {
  const date = new Date(dateStr);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  return {
    date: `${day}/${month}/${year}`,
    time: `${hours}:${minutes}`,
  };
};

// QR Code for BCEL One Pay
const BCEL_QR_CODE = '00020101021115312738041800520446mch19B73F61B9E038570016A00526628466257701082771041802030020314mch19B73F61B9E5204569153034185802LA5916AKAPHON XAYYABED6002VT62120208586625406304C735';

// Draw QR Code (simplified pattern for PDF)
const drawQRCode = (doc: jsPDF, x: number, y: number, size: number) => {
  const moduleSize = size / 25;
  doc.setFillColor(0, 0, 0);
  
  // Generate simple QR pattern
  for (let row = 0; row < 25; row++) {
    for (let col = 0; col < 25; col++) {
      // Position detection patterns (corners)
      const isCorner = (row < 7 && col < 7) || 
                       (row < 7 && col > 17) || 
                       (row > 17 && col < 7);
      
      // Random-ish data pattern
      const isData = ((row + col) % 2 === 0 || (row * col) % 3 === 0) && !isCorner;
      
      if (isCorner || isData) {
        // Corner patterns
        if (isCorner) {
          const cornerX = col < 7 ? 0 : (col > 17 ? 18 : 0);
          const cornerY = row < 7 ? 0 : (row > 17 ? 18 : 0);
          const localRow = row - cornerY;
          const localCol = col - cornerX;
          
          if (localRow === 0 || localRow === 6 || localCol === 0 || localCol === 6 ||
              (localRow >= 2 && localRow <= 4 && localCol >= 2 && localCol <= 4)) {
            doc.rect(x + col * moduleSize, y + row * moduleSize, moduleSize, moduleSize, 'F');
          }
        } else {
          doc.rect(x + col * moduleSize, y + row * moduleSize, moduleSize, moduleSize, 'F');
        }
      }
    }
  }
};

// Generate POS Receipt PDF (Thermal printer format - 80mm or 58mm)
export const generatePOSReceiptPDF = (data: ReceiptData, paperWidth: 80 | 58 = 80, showQR: boolean = true) => {
  const { sale, items, employee, storeInfo, receivedAmount, changeAmount, customer, pointsDiscount } = data;
  
  // Calculate receipt height based on items
  const baseHeight = showQR && sale.payment_method === 'qr' ? 160 : 130;
  const itemHeight = items.length * 6;
  const totalHeight = baseHeight + itemHeight;
  
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [paperWidth, Math.max(totalHeight, 100)],
  });

  const pageWidth = paperWidth;
  const margin = 3;
  let y = 6;

  // Helper function to draw dashed line
  const drawDashedLine = (yPos: number) => {
    doc.setLineDashPattern([1, 1], 0);
    doc.setLineWidth(0.1);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    doc.setLineDashPattern([], 0);
  };

  // === STORE LOGO ===
  if (storeInfo.logo) {
    try {
      doc.addImage(storeInfo.logo, 'JPEG', (pageWidth - 20) / 2, y, 20, 20);
      y += 22;
    } catch (e) {
      // Skip logo if error
    }
  }

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
  
  doc.setFontSize(paperWidth === 80 ? 10 : 9);
  doc.setFont('helvetica', 'bold');
  doc.text('ໃບບິນຂາຍ', pageWidth / 2, y, { align: 'center' });
  y += 5;
  
  doc.setFontSize(paperWidth === 80 ? 8 : 7);
  doc.setFont('helvetica', 'normal');
  doc.text(`ເລກທີ່: ${sale.sale_number}`, margin, y);
  y += 3.5;
  doc.text(`ວັນທີ່: ${date}`, margin, y);
  doc.text(`ເວລາ: ${time}`, pageWidth - margin, y, { align: 'right' });
  y += 3.5;
  
  // Employee
  if (employee) {
    doc.text(`ພະນັກງານ: ${employee.name}`, margin, y);
    y += 3.5;
  }
  
  // Customer
  if (customer) {
    doc.text(`ລູກຄ້າ: ${customer.name}`, margin, y);
    y += 3.5;
    if (customer.phone) {
      doc.text(`ເບີໂທ: ${customer.phone}`, margin, y);
      y += 3.5;
    }
  }
  
  // Payment method
  doc.text(`ຊຳລະດ້ວຍ: ${getPaymentMethodLabel(sale.payment_method)}`, margin, y);

  // === DIVIDER ===
  y += 2;
  drawDashedLine(y);
  y += 4;

  // === ITEMS TABLE HEADER ===
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(paperWidth === 80 ? 8 : 7);
  doc.text('ລາຍການສິນຄ້າ', margin, y);
  doc.text('ຈຳນວນ', pageWidth / 2, y, { align: 'center' });
  doc.text('ລວມ', pageWidth - margin, y, { align: 'right' });
  y += 1;
  drawDashedLine(y);
  y += 3;

  // === ITEMS ===
  doc.setFont('helvetica', 'normal');
  items.forEach((item, index) => {
    // Product name (may wrap)
    const maxNameLength = paperWidth === 80 ? 18 : 14;
    const name = item.product_name.length > maxNameLength 
      ? item.product_name.substring(0, maxNameLength) + '...' 
      : item.product_name;
    
    doc.text(`${index + 1}. ${name}`, margin, y);
    doc.text(`${item.quantity}x${formatNumber(item.unit_price)}`, pageWidth / 2, y, { align: 'center' });
    doc.text(`${formatNumber(item.total_price)}`, pageWidth - margin, y, { align: 'right' });
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
      doc.text('ສ່ວນຫຼຸດຄະແນນສະສົມ:', margin, y);
      doc.text(`-₭${formatNumber(pointsDiscount)}`, pageWidth - margin, y, { align: 'right' });
      y += 4;
    } else {
      doc.text('ສ່ວນຫຼຸດ:', margin, y);
      doc.text(`-₭${formatNumber(sale.discount_amount)}`, pageWidth - margin, y, { align: 'right' });
      y += 4;
    }
  }

  // Final amount
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(paperWidth === 80 ? 11 : 10);
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
    doc.setFont('helvetica', 'bold');
    doc.text('ເງິນທອນ:', margin, y);
    doc.text(`₭${formatNumber(changeAmount || 0)}`, pageWidth - margin, y, { align: 'right' });
    y += 4;
  }

  // === QR CODE FOR QR PAYMENT ===
  if (showQR && sale.payment_method === 'qr') {
    y += 2;
    drawDashedLine(y);
    y += 4;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(paperWidth === 80 ? 9 : 8);
    doc.text('ສະແກນ QR ເພື່ອຊຳລະເງິນ', pageWidth / 2, y, { align: 'center' });
    y += 3;
    
    // Draw QR Code
    const qrSize = paperWidth === 80 ? 30 : 25;
    drawQRCode(doc, (pageWidth - qrSize) / 2, y, qrSize);
    y += qrSize + 3;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.text('BCEL One Pay', pageWidth / 2, y, { align: 'center' });
    y += 4;
  }

  // === LOYALTY POINTS INFO ===
  if (customer) {
    y += 2;
    drawDashedLine(y);
    y += 4;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(paperWidth === 80 ? 7 : 6);
    
    const earnedPoints = Math.floor(sale.final_amount / 10000);
    const newPoints = customer.loyalty_points - (pointsDiscount ? Math.ceil(pointsDiscount / 100) : 0) + earnedPoints;
    
    doc.text(`ຄະແນນສະສົມໃໝ່: ${newPoints} ຄະແນນ`, pageWidth / 2, y, { align: 'center' });
    y += 3;
    doc.text('(ທຸກ ₭10,000 = 1 ຄະແນນ)', pageWidth / 2, y, { align: 'center' });
    y += 4;
  }

  // === FOOTER ===
  y += 2;
  drawDashedLine(y);
  y += 4;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(paperWidth === 80 ? 8 : 7);
  doc.text('ຂອບໃຈທີ່ອຸດໜູນ!', pageWidth / 2, y, { align: 'center' });
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(paperWidth === 80 ? 6 : 5);
  doc.text('Thank you for your purchase!', pageWidth / 2, y, { align: 'center' });

  return doc;
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

// Print receipt - opens print dialog
export const printReceipt = async (data: ReceiptData, paperWidth: 80 | 58 = 80, showQR: boolean = true) => {
  const doc = generatePOSReceiptPDF(data, paperWidth, showQR);
  
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
export const downloadReceipt = (data: ReceiptData, paperWidth: 80 | 58 = 80, showQR: boolean = true) => {
  const doc = generatePOSReceiptPDF(data, paperWidth, showQR);
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
  items.forEach((item, index) => {
    const maxNameLength = paperWidth === 80 ? 15 : 12;
    const name = item.product_name.length > maxNameLength 
      ? item.product_name.substring(0, maxNameLength) + '...' 
      : item.product_name;
    doc.text(`${index + 1}. ${name}`, margin, y);
    doc.text(`${item.quantity}x${formatNumber(item.unit_price)}`, pageWidth / 2, y, { align: 'center' });
    doc.text(`₭${formatNumber(item.total_price)}`, pageWidth - margin, y, { align: 'right' });
    y += 4;
  });

  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.text('ຍອດສຸດທິ:', margin, y);
  doc.text(`₭${formatNumber(finalAmount)}`, pageWidth - margin, y, { align: 'right' });

  return doc;
};
