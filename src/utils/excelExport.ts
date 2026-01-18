import * as XLSX from 'xlsx';
import { Sale, SaleItem } from '@/hooks/useSales';
import { format } from 'date-fns';

interface SaleWithItems extends Sale {
  items?: SaleItem[];
}

export function exportSalesToExcel(
  sales: SaleWithItems[],
  filename: string = 'sales-report'
) {
  // Create workbook
  const wb = XLSX.utils.book_new();

  // Sales summary sheet
  const summaryData = sales.map(sale => ({
    'ເລກບິນ': sale.sale_number,
    'ວັນທີ': format(new Date(sale.created_at), 'dd/MM/yyyy'),
    'ເວລາ': format(new Date(sale.created_at), 'HH:mm:ss'),
    'ວິທີຊຳລະ': sale.payment_method === 'cash' ? 'ເງິນສົດ' : 
                sale.payment_method === 'transfer' ? 'ໂອນ' : 'QR Code',
    'ຍອດຮວມ': sale.total_amount,
    'ສ່ວນຫຼຸດ': sale.discount_amount,
    'ຍອດສຸດທິ': sale.final_amount,
    'ສະຖານະ': sale.status === 'completed' ? 'ສຳເລັດ' : 'ຍົກເລີກ',
    'ໝາຍເຫດ': sale.note || '',
  }));

  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summarySheet, 'ສະຫຼຸບການຂາຍ');

  // Calculate totals
  const totalRevenue = sales.filter(s => s.status === 'completed')
    .reduce((sum, s) => sum + s.final_amount, 0);
  const totalDiscount = sales.filter(s => s.status === 'completed')
    .reduce((sum, s) => sum + s.discount_amount, 0);
  const completedSales = sales.filter(s => s.status === 'completed').length;
  const cancelledSales = sales.filter(s => s.status === 'cancelled').length;

  // Stats sheet
  const statsData = [
    { 'ລາຍການ': 'ຈຳນວນບິນທັງໝົດ', 'ຄ່າ': sales.length },
    { 'ລາຍການ': 'ບິນສຳເລັດ', 'ຄ່າ': completedSales },
    { 'ລາຍການ': 'ບິນຍົກເລີກ', 'ຄ່າ': cancelledSales },
    { 'ລາຍການ': 'ຍອດຂາຍລວມ', 'ຄ່າ': totalRevenue },
    { 'ລາຍການ': 'ສ່ວນຫຼຸດລວມ', 'ຄ່າ': totalDiscount },
    { 'ລາຍການ': 'ສະເລ່ຍ/ບິນ', 'ຄ່າ': completedSales > 0 ? Math.round(totalRevenue / completedSales) : 0 },
  ];

  const statsSheet = XLSX.utils.json_to_sheet(statsData);
  XLSX.utils.book_append_sheet(wb, statsSheet, 'ສະຖິຕິ');

  // Download file
  const dateStr = format(new Date(), 'yyyy-MM-dd');
  XLSX.writeFile(wb, `${filename}-${dateStr}.xlsx`);
}

export function exportDailySalesToExcel(
  sales: Sale[],
  date: Date
) {
  const dateStr = format(date, 'dd-MM-yyyy');
  exportSalesToExcel(sales, `ລາຍງານການຂາຍປະຈຳວັນ-${dateStr}`);
}

export function exportMonthlySalesToExcel(
  sales: Sale[],
  year: number,
  month: number
) {
  const months = ['', 'ມັງກອນ', 'ກຸມພາ', 'ມີນາ', 'ເມສາ', 'ພຶດສະພາ', 'ມິຖຸນາ', 
                  'ກໍລະກົດ', 'ສິງຫາ', 'ກັນຍາ', 'ຕຸລາ', 'ພະຈິກ', 'ທັນວາ'];
  exportSalesToExcel(sales, `ລາຍງານການຂາຍ-${months[month]}-${year}`);
}

// Export products report
export function exportProductsToExcel(products: any[]) {
  const wb = XLSX.utils.book_new();

  const productsData = products.map(p => ({
    'ຊື່ສິນຄ້າ': p.name,
    'ບາໂຄ້ດ': p.barcode || '',
    'ລາຄາຕົ້ນທຶນ': p.cost_price,
    'ລາຄາຂາຍ': p.selling_price,
    'ກຳໄລ': p.selling_price - p.cost_price,
    'ສະຕ໊ອກ': p.stock_quantity,
    'ສະຕ໊ອກຂັ້ນຕ່ຳ': p.min_stock_level,
    'ໜ່ວຍ': p.unit,
    'ສະຖານະ': p.is_active ? 'ໃຊ້ງານ' : 'ປິດໃຊ້ງານ',
  }));

  const productsSheet = XLSX.utils.json_to_sheet(productsData);
  XLSX.utils.book_append_sheet(wb, productsSheet, 'ສິນຄ້າ');

  const dateStr = format(new Date(), 'yyyy-MM-dd');
  XLSX.writeFile(wb, `ລາຍການສິນຄ້າ-${dateStr}.xlsx`);
}

// Export customers report
export function exportCustomersToExcel(customers: any[]) {
  const wb = XLSX.utils.book_new();

  const customersData = customers.map(c => ({
    'ຊື່': c.name,
    'ເບີໂທ': c.phone || '',
    'ອີເມວ': c.email || '',
    'ທີ່ຢູ່': c.address || '',
    'ຄະແນນສະສົມ': c.loyalty_points,
    'ຍອດຊື້ທັງໝົດ': c.total_purchases,
    'ລົງທະບຽນ': format(new Date(c.created_at), 'dd/MM/yyyy'),
  }));

  const customersSheet = XLSX.utils.json_to_sheet(customersData);
  XLSX.utils.book_append_sheet(wb, customersSheet, 'ລູກຄ້າ');

  const dateStr = format(new Date(), 'yyyy-MM-dd');
  XLSX.writeFile(wb, `ລາຍຊື່ລູກຄ້າ-${dateStr}.xlsx`);
}
