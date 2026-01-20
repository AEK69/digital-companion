import jsPDF from 'jspdf';
import { Product } from '@/hooks/useProducts';

interface BarcodeLabelData {
  product: Product;
  quantity?: number;
  storeInfo?: { name: string };
}

// Generate barcode label PDF for printing
export const generateBarcodeLabel = (data: BarcodeLabelData, labelSize: '50x30' | '40x25' = '50x30') => {
  const { product, quantity = 1, storeInfo } = data;
  
  // Label dimensions in mm
  const sizes = {
    '50x30': { width: 50, height: 30 },
    '40x25': { width: 40, height: 25 },
  };
  
  const size = sizes[labelSize];
  const pageHeight = size.height * quantity + (quantity - 1) * 2; // Add spacing between labels
  
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [size.width, pageHeight],
  });

  for (let i = 0; i < quantity; i++) {
    const yOffset = i * (size.height + 2);
    
    // Add new page for each label after the first
    if (i > 0) {
      // Just continue on same page with offset
    }
    
    const margin = 2;
    let y = yOffset + 3;
    
    // Product name (truncated if too long)
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    const productName = product.name.length > 20 
      ? product.name.substring(0, 20) + '...' 
      : product.name;
    doc.text(productName, size.width / 2, y, { align: 'center' });
    
    y += 4;
    
    // Barcode visualization (using Code 128 style bars)
    if (product.barcode) {
      const barcodeWidth = size.width - margin * 4;
      const barcodeHeight = labelSize === '50x30' ? 10 : 8;
      const startX = margin * 2;
      
      // Draw barcode pattern (simplified representation)
      doc.setFillColor(0, 0, 0);
      const barcode = product.barcode;
      const barWidth = barcodeWidth / (barcode.length * 3 + 10);
      
      // Start bars
      doc.rect(startX, y, barWidth, barcodeHeight, 'F');
      doc.rect(startX + barWidth * 2, y, barWidth, barcodeHeight, 'F');
      
      // Data bars
      let currentX = startX + barWidth * 4;
      for (let j = 0; j < barcode.length; j++) {
        const charCode = barcode.charCodeAt(j);
        const pattern = charCode % 2 === 0 ? [1, 0, 1, 0] : [1, 1, 0, 1];
        for (const bar of pattern) {
          if (bar === 1) {
            doc.rect(currentX, y, barWidth, barcodeHeight, 'F');
          }
          currentX += barWidth * 0.7;
        }
      }
      
      // End bars
      doc.rect(currentX + barWidth, y, barWidth, barcodeHeight, 'F');
      doc.rect(currentX + barWidth * 3, y, barWidth, barcodeHeight, 'F');
      
      y += barcodeHeight + 2;
      
      // Barcode number
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(product.barcode, size.width / 2, y, { align: 'center' });
      y += 3;
    }
    
    // Price
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`₭${product.selling_price.toLocaleString()}`, size.width / 2, y, { align: 'center' });
    
    // Store name (if provided)
    if (storeInfo && labelSize === '50x30') {
      y += 4;
      doc.setFontSize(5);
      doc.setFont('helvetica', 'normal');
      doc.text(storeInfo.name, size.width / 2, y, { align: 'center' });
    }
  }

  return doc;
};

// Print barcode labels
export const printBarcodeLabels = (data: BarcodeLabelData, labelSize: '50x30' | '40x25' = '50x30') => {
  const doc = generateBarcodeLabel(data, labelSize);
  
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

// Download barcode labels as PDF
export const downloadBarcodeLabels = (data: BarcodeLabelData, labelSize: '50x30' | '40x25' = '50x30') => {
  const doc = generateBarcodeLabel(data, labelSize);
  doc.save(`barcode-${data.product.barcode || data.product.id}.pdf`);
  return doc;
};

// Print multiple product barcodes
export const printMultipleBarcodes = (products: Product[], quantityPerProduct: number = 1, storeInfo?: { name: string }) => {
  if (products.length === 0) return;
  
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  
  const labelWidth = 50;
  const labelHeight = 30;
  const margin = 10;
  const cols = 4;
  const rows = 8;
  
  let currentPage = 0;
  let col = 0;
  let row = 0;
  
  products.forEach((product, productIndex) => {
    for (let qty = 0; qty < quantityPerProduct; qty++) {
      // Add new page if needed
      if (row >= rows) {
        col++;
        row = 0;
        if (col >= cols) {
          doc.addPage();
          col = 0;
          currentPage++;
        }
      }
      
      const x = margin + col * (labelWidth + 2);
      const y = margin + row * (labelHeight + 2);
      
      // Draw label border
      doc.setDrawColor(200);
      doc.rect(x, y, labelWidth, labelHeight);
      
      // Product name
      let labelY = y + 5;
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      const productName = product.name.length > 22 
        ? product.name.substring(0, 22) + '...' 
        : product.name;
      doc.text(productName, x + labelWidth / 2, labelY, { align: 'center' });
      
      labelY += 4;
      
      // Barcode placeholder (simplified)
      if (product.barcode) {
        const barcodeWidth = labelWidth - 8;
        const barcodeHeight = 10;
        const startX = x + 4;
        
        doc.setFillColor(0, 0, 0);
        const barcode = product.barcode;
        const barWidth = barcodeWidth / (barcode.length * 2 + 10);
        
        let currentX = startX;
        for (let j = 0; j < barcode.length * 2 + 10; j++) {
          if (j % 2 === 0) {
            doc.rect(currentX, labelY, barWidth * 0.8, barcodeHeight, 'F');
          }
          currentX += barWidth;
        }
        
        labelY += barcodeHeight + 2;
        
        // Barcode number
        doc.setFontSize(6);
        doc.setFont('helvetica', 'normal');
        doc.text(product.barcode, x + labelWidth / 2, labelY, { align: 'center' });
        labelY += 3;
      }
      
      // Price
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(`₭${product.selling_price.toLocaleString()}`, x + labelWidth / 2, labelY, { align: 'center' });
      
      // Store name
      if (storeInfo) {
        labelY += 3;
        doc.setFontSize(5);
        doc.setFont('helvetica', 'normal');
        doc.text(storeInfo.name, x + labelWidth / 2, labelY, { align: 'center' });
      }
      
      row++;
    }
  });
  
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
