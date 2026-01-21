import { Product } from '@/hooks/useProducts';

interface BarcodeLabelData {
  product: Product;
  quantity?: number;
  storeInfo?: { name: string };
}

// Format number with comma
const formatNumber = (num: number) => num.toLocaleString('en-US');

// Generate HTML barcode label that supports Lao font
const generateBarcodeLabelHTML = (data: BarcodeLabelData, labelSize: '50x30' | '40x25' = '50x30'): string => {
  const { product, quantity = 1, storeInfo } = data;
  
  const sizes = {
    '50x30': { width: 50, height: 30 },
    '40x25': { width: 40, height: 25 },
  };
  
  const size = sizes[labelSize];
  
  // Generate labels HTML
  const labelsHTML = Array.from({ length: quantity }, (_, i) => `
    <div class="label" style="width: ${size.width}mm; height: ${size.height}mm;">
      <div class="product-name">${product.name}</div>
      ${product.barcode ? `
        <div class="barcode-container">
          <svg class="barcode" viewBox="0 0 100 30">
            ${generateBarcodePattern(product.barcode)}
          </svg>
          <div class="barcode-text">${product.barcode}</div>
        </div>
      ` : ''}
      <div class="price">₭${formatNumber(product.selling_price)}</div>
      ${storeInfo && labelSize === '50x30' ? `<div class="store-name">${storeInfo.name}</div>` : ''}
    </div>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>ບາໂຄ້ດ - ${product.name}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Lao:wght@400;600;700&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Noto Sans Lao', Arial, sans-serif;
          background: white;
          padding: 5mm;
        }
        
        .labels-container {
          display: flex;
          flex-wrap: wrap;
          gap: 2mm;
        }
        
        .label {
          border: 1px solid #ddd;
          padding: 2mm;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          page-break-inside: avoid;
        }
        
        .product-name {
          font-size: ${labelSize === '50x30' ? '9px' : '8px'};
          font-weight: 600;
          text-align: center;
          margin-bottom: 2mm;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .barcode-container {
          text-align: center;
          margin-bottom: 2mm;
        }
        
        .barcode {
          width: ${labelSize === '50x30' ? '40mm' : '30mm'};
          height: ${labelSize === '50x30' ? '10mm' : '8mm'};
        }
        
        .barcode-text {
          font-size: 7px;
          font-family: monospace;
          letter-spacing: 1px;
        }
        
        .price {
          font-size: ${labelSize === '50x30' ? '12px' : '10px'};
          font-weight: 700;
          color: #333;
        }
        
        .store-name {
          font-size: 6px;
          color: #666;
          margin-top: 1mm;
        }
        
        @media print {
          body {
            padding: 0;
          }
          
          .label {
            border: 1px dashed #ccc;
          }
          
          @page {
            size: auto;
            margin: 5mm;
          }
        }
      </style>
    </head>
    <body>
      <div class="labels-container">
        ${labelsHTML}
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

// Generate simple barcode pattern as SVG
const generateBarcodePattern = (barcode: string): string => {
  let pattern = '';
  const barWidth = 100 / (barcode.length * 3 + 10);
  let x = 5;
  
  // Start pattern
  pattern += `<rect x="${x}" y="0" width="${barWidth}" height="30" fill="black"/>`;
  x += barWidth * 2;
  pattern += `<rect x="${x}" y="0" width="${barWidth}" height="30" fill="black"/>`;
  x += barWidth * 2;
  
  // Data bars
  for (let i = 0; i < barcode.length; i++) {
    const charCode = barcode.charCodeAt(i);
    const bars = charCode % 2 === 0 ? [1, 0, 1, 0] : [1, 1, 0, 1];
    for (const bar of bars) {
      if (bar === 1) {
        pattern += `<rect x="${x}" y="0" width="${barWidth * 0.8}" height="30" fill="black"/>`;
      }
      x += barWidth;
    }
  }
  
  // End pattern
  pattern += `<rect x="${x}" y="0" width="${barWidth}" height="30" fill="black"/>`;
  x += barWidth * 2;
  pattern += `<rect x="${x}" y="0" width="${barWidth}" height="30" fill="black"/>`;
  
  return pattern;
};

// Print barcode labels
export const printBarcodeLabels = (data: BarcodeLabelData, labelSize: '50x30' | '40x25' = '50x30') => {
  const html = generateBarcodeLabelHTML(data, labelSize);
  
  const printWindow = window.open('', '_blank', 'width=400,height=400');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
};

// Download barcode labels as HTML file
export const downloadBarcodeLabels = (data: BarcodeLabelData, labelSize: '50x30' | '40x25' = '50x30') => {
  const html = generateBarcodeLabelHTML(data, labelSize);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `barcode-${data.product.barcode || data.product.id}.html`;
  a.click();
  URL.revokeObjectURL(url);
};

// Print multiple product barcodes (A4 grid)
export const printMultipleBarcodes = (products: Product[], quantityPerProduct: number = 1, storeInfo?: { name: string }) => {
  if (products.length === 0) return;
  
  const labelsHTML = products.flatMap(product => 
    Array.from({ length: quantityPerProduct }, () => `
      <div class="label">
        <div class="product-name">${product.name}</div>
        ${product.barcode ? `
          <div class="barcode-container">
            <svg class="barcode" viewBox="0 0 100 30">
              ${generateBarcodePattern(product.barcode)}
            </svg>
            <div class="barcode-text">${product.barcode}</div>
          </div>
        ` : ''}
        <div class="price">₭${formatNumber(product.selling_price)}</div>
        ${storeInfo ? `<div class="store-name">${storeInfo.name}</div>` : ''}
      </div>
    `)
  ).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>ພິມບາໂຄ້ດ</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Lao:wght@400;600;700&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Noto Sans Lao', Arial, sans-serif;
          background: white;
          padding: 10mm;
        }
        
        .labels-container {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 2mm;
        }
        
        .label {
          border: 1px dashed #ccc;
          padding: 3mm;
          height: 30mm;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          page-break-inside: avoid;
        }
        
        .product-name {
          font-size: 8px;
          font-weight: 600;
          text-align: center;
          margin-bottom: 2mm;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .barcode-container {
          text-align: center;
          margin-bottom: 2mm;
        }
        
        .barcode {
          width: 35mm;
          height: 10mm;
        }
        
        .barcode-text {
          font-size: 6px;
          font-family: monospace;
        }
        
        .price {
          font-size: 10px;
          font-weight: 700;
        }
        
        .store-name {
          font-size: 5px;
          color: #666;
          margin-top: 1mm;
        }
        
        @media print {
          body {
            padding: 5mm;
          }
          
          @page {
            size: A4;
            margin: 5mm;
          }
        }
      </style>
    </head>
    <body>
      <div class="labels-container">
        ${labelsHTML}
      </div>
      
      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `;
  
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
};

// Legacy export for compatibility
export const generateBarcodeLabel = (data: BarcodeLabelData, labelSize: '50x30' | '40x25' = '50x30') => {
  printBarcodeLabels(data, labelSize);
};
