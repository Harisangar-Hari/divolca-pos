// src/utils/printA4Receipt.ts

export interface PrintItem {
  name: string;
  quantity: number;
  price: number;
  discountPercent?: number;
  discountRs?: number;
  sku?: string;
}

export interface ReceiptData {
  invoiceNumber?: string;
  items: PrintItem[];
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  total: number;
  paid: number;
  change?: number;
  balance?: number;
  paymentMode: "cash" | "credit" | "card";
  invoiceDiscount?: number;
  invoiceDiscountAmount?: number;
  outstandingBalance?: number;
  totalDue?: number;
  previousOutstanding?: number;
}

// Helper: Format currency with commas
function fmt(num: number): string {
  return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Helper: Convert number to words (LKR)
function numberToWords(num: number): string {
  if (num === 0) return "Zero";

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const numToWords = (n: number): string => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + numToWords(n % 100) : '');
    if (n < 100000) return numToWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + numToWords(n % 1000) : '');
    if (n < 10000000) return numToWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + numToWords(n % 100000) : '');
    return numToWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + numToWords(n % 10000000) : '');
  };

  const rupees = Math.floor(num);
  const cents = Math.round((num - rupees) * 100);

  let result = numToWords(rupees) + ' Rupees';
  if (cents > 0) {
    result += ' and ' + numToWords(cents) + ' Cents';
  }
  return result;
}

export async function printA4Receipt(data: ReceiptData): Promise<void> {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];

  const dueDate = new Date(now);
  dueDate.setDate(dueDate.getDate() + 60);
  const dueDateStr = dueDate.toISOString().split("T")[0];

  const previousOutstanding = data.previousOutstanding || 0;
  const totalDue = previousOutstanding + (data.balance || 0);

  let totalItemDiscount = 0;
  let grandTotalWithoutDiscount = 0;

  const MAX_ITEMS = 15;
  const items = data.items.slice(0, MAX_ITEMS);
  const hasMoreItems = data.items.length > MAX_ITEMS;

  const rows = items.map((item, index) => {
    const pctDisc = item.discountPercent || 0;
    const rsDisc = item.discountRs || 0;

    const originalPrice = item.price;
    const priceAfterPct = originalPrice - (originalPrice * (pctDisc / 100));
    const discountedPrice = Math.max(0, priceAfterPct - rsDisc);
    const lineFinalTotal = discountedPrice * item.quantity;

    const realUnitDiscount = originalPrice - discountedPrice;
    const totalDiscount = realUnitDiscount * item.quantity;
    totalItemDiscount += totalDiscount;
    grandTotalWithoutDiscount += (originalPrice * item.quantity);

    const discountDisplay = pctDisc > 0 ? `${pctDisc}%` : "0%";

    const qtyDisplay = item.quantity > 1 ? `${item.quantity} pcs` : `${item.quantity} pcs`;

    return `
      <tr>
        <td class="sn">${index + 1}</td>
        <td class="desc">${item.name}</td>
        <td class="qty">${qtyDisplay}</td>
        <td class="rate">${fmt(originalPrice)}</td>
        <td class="dis">${discountDisplay}</td>
        <td class="amount">${fmt(lineFinalTotal)}</td>
      </tr>
    `;
  }).join("");

  const moreItemsRow = hasMoreItems ? `
    <tr>
      <td colspan="6" style="text-align: center; font-style: italic; color: #666; padding: 2px 0; font-size: 8pt;">
        ... and ${data.items.length - MAX_ITEMS} more items
      </td>
    </tr>
  ` : '';

  const combinedDiscountAmount = totalItemDiscount + (data.invoiceDiscountAmount || 0);
  const discountPercentApplied = data.invoiceDiscount ? `${data.invoiceDiscount}` : "0";
  const totalOutstanding = data.totalDue ?? data.outstandingBalance ?? 0;

  const netTotal = grandTotalWithoutDiscount - combinedDiscountAmount;
  const words = numberToWords(netTotal);

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>INVOICE ${data.invoiceNumber}</title>
  <style>
    * { 
      margin: 0; 
      padding: 0; 
      box-sizing: border-box; 
    }
    
    @page { 
      size: 216mm 279mm;
      margin: 5mm 7mm 20mm 7mm;
      padding-bottom: 20mm;
      @top-center {
        content: none !important;
      }
      @bottom-center {
        content: none !important;
      }
      @top-left {
        content: none !important;
      }
      @top-right {
        content: none !important;
      }
      @bottom-left {
        content: none !important;
      }
      @bottom-right {
        content: none !important;
      }
    }

    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 10pt;
      line-height: 1.2;
      color: #000;
      margin-bottom: 20mm;
      padding: 5px;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }

    .invoice {
      max-width: 216mm;
      width: 100%;
      height: 279mm;
      max-height: 279mm;
      background: #ffffff;
      padding: 8px 12px 12px 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      border: 1px solid #e0e0e0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    /* HEADER - Reduced */
    .header {
      text-align: center;
      border-bottom: 2px solid #000;
      padding-bottom: 3px;
      margin-bottom: 4px;
      flex-shrink: 0;
    }

    .company-name {
      font-size: 15pt;
      font-weight: bold;
      letter-spacing: 1px;
    }

    .company-address {
      font-size: 8.5pt;
      margin-top: 1px;
    }

    .company-contact {
      font-size: 8.5pt;
    }

    .company-vat {
      font-size: 8.5pt;
      font-weight: bold;
    }

    /* INVOICE TITLE ROW - Reduced */
    .invoice-title-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 3px;
      flex-shrink: 0;
    }

    .invoice-title {
      font-size: 13pt;
      font-weight: bold;
      letter-spacing: 2px;
      text-decoration: underline;
    }

    .invoice-number {
      font-size: 10pt;
      font-weight: bold;
    }

    .invoice-number .label {
      font-weight: normal;
    }

    /* CUSTOMER DETAILS - Reduced */
    .customer-section {
      margin-bottom: 3px;
      flex-shrink: 0;
    }

    .customer-section .label {
      font-weight: bold;
      font-size: 9.5pt;
    }

    .customer-details {
      display: flex;
      flex-wrap: wrap;
      gap: 1px 12px;
      padding: 1px 0;
      font-size: 8.5pt;
    }

    .customer-details .field {
      display: flex;
      gap: 3px;
    }

    .customer-details .field .label {
      font-weight: bold;
      min-width: 45px;
    }

    /* TABLE - Reduced padding and font size */
    .table-wrap {
      margin: 2px 0;
      flex: 1 1 auto;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10pt;
    }

    th {
      background: #e8e8e8;
      font-weight: bold;
      padding: 2px 2px;
      text-align: center;
      border: none;
      border-bottom: 2px solid #000;
      font-size: 10pt;
    }

    td {
      padding: 1.5px 2px;
      text-align: center;
      border: none;
      border-bottom: 1px solid #e0e0e0;
      font-size: 10pt;
    }

    tr:last-child td {
      border-bottom: none;
    }

    tr:nth-child(even) {
      background-color: #f9f9f9;
    }

    .sn { width: 18px; }
    .desc { text-align: left; padding-left: 3px; }
    .qty { width: 38px; }
    .rate { width: 50px; text-align: right; padding-right: 3px; }
    .dis { width: 40px; text-align: right; padding-right: 3px; }
    .amount { width: 60px; text-align: right; padding-right: 3px; font-weight: bold; }

    /* AMOUNT IN WORDS - Reduced */
    .words-section {
      margin: 2px 0;
      padding: 2px 0;
      border-top: 1px solid #000;
      border-bottom: 1px solid #000;
      flex-shrink: 0;
      font-size: 8.5pt;
    }

    .words-section .label {
      font-weight: bold;
    }

    /* TOTALS - Reduced */
    .totals-section {
      margin: 2px 0;
      display: flex;
      justify-content: flex-end;
      flex-shrink: 0;
    }

    .totals-table {
      width: auto;
      border: none;
    }

    .totals-table td {
      border: none;
      padding: 1px 5px;
      font-size: 8.5pt;
    }

    .totals-table .label {
      font-weight: bold;
      text-align: left;
      padding-right: 15px;
    }

    .totals-table .value {
      text-align: right;
      font-weight: bold;
    }

    .totals-table .total-row td {
      font-size: 9.5pt;
      font-weight: bold;
      border-top: 2px solid #000;
      padding-top: 2px;
    }

    .totals-table .discount-row td {
      color: #000;
    }

    /* OUTSTANDING - Reduced */
    .outstanding-box {
      background: #fef3f2;
      border: 1px solid #dc2626;
      padding: 2px 6px;
      margin: 2px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
    }
    .outstanding-box .label {
      font-weight: bold;
      color: #000;
      font-size: 9pt;
    }
    .outstanding-box .value {
      font-weight: bold;
      color: #000;
      font-size: 10pt;
    }

    /* BANK DETAILS - Reduced */
    .bank-details {
      margin: 2px 0;
      padding: 2px 6px;
      background: #f5f5f5;
      border: 1px solid #ddd;
      font-size: 9pt;
      flex-shrink: 0;
      display: flex;
      flex-wrap: wrap;
      gap: 2px 12px;
    }

    .bank-details .label {
      font-weight: bold;
    }

    /* BULK DISCOUNT INFO - Reduced */
    .bulk-discount-info {
      margin: 2px 0;
      padding: 2px 6px;
      background: #f0f7ff;
      border: 1px solid #d4e0ef;
      font-size: 7.5pt;
      flex-shrink: 0;
      display: flex;
      flex-wrap: wrap;
      gap: 2px 12px;
      justify-content: center;
    }

    .bulk-discount-info .label {
      font-weight: bold;
      color: #000;
    }

    .bulk-discount-info .slab {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      padding: 0 6px;
    }

    .bulk-discount-info .highlight {
      color: #000;
      font-weight: bold;
    }

    /* TERMS - Tamil - Reduced */
    .terms-section {
      margin: 2px 0 1px 0;
      padding-top: 2px;
      border-top: 2px solid #000;
      font-size: 6.5pt;
      flex-shrink: 0;
    }

    .terms-title {
      font-weight: bold;
      font-size: 7pt;
      margin-bottom: 1px;
    }

    .terms-section ul {
      list-style: none;
      padding-left: 0;
    }

    .terms-section ul li {
      padding: 0.2px 0;
      font-size: 6.5pt;
      font-family: 'Latha', 'Bamini', 'Times New Roman', sans-serif;
    }

    .terms-section ul li::before {
      content: "• ";
      font-weight: bold;
    }

    /* SIGNATURE - More space */
    .signature-section {
      display: flex;
      justify-content: space-between;
      margin-top: 4px;
      padding-top: 4px;
      border-top: 1px solid #000;
      flex-shrink: 0;
      gap: 8px;
    }

    .signature-box {
      flex: 1;
      padding: 2px 4px;
      min-width: 0;
    }

    .signature-box .label {
      font-weight: bold;
      font-size: 7.5pt;
      white-space: nowrap;
    }

    .signature-box .line {
      border-bottom: 1px solid #000;
      min-height: 20px;
      margin-top: 2px;
    }

    .no-page-break {
      page-break-inside: avoid;
    }

    @media print {
      body { 
        background: white; 
        margin: 0; 
        padding: 0; 
        display: block;
        min-height: auto;
      }
      
      .invoice { 
        padding: 0; 
        box-shadow: none;
        border: none;
        height: 100vh;
        max-height: 100vh;
        page-break-after: avoid;
        page-break-inside: avoid;
        overflow: hidden;
      }
      
      @page {
        margin: 5mm 7mm 12mm 7mm;
        @top-center {
          content: none !important;
        }
        @bottom-center {
          content: none !important;
        }
        @top-left {
          content: none !important;
        }
        @top-right {
          content: none !important;
        }
        @bottom-left {
          content: none !important;
        }
        @bottom-right {
          content: none !important;
        }
      }
      
      th { 
        background: #e8e8e8 !important; 
        border: none !important;
        border-bottom: 2px solid #000 !important;
      }
      td { 
        border: none !important;
        border-bottom: 1px solid #e0e0e0 !important;
      }
      tr:last-child td {
        border-bottom: none !important;
      }
      .signature-box .line { border-bottom: 1px solid #000; }
      
      html, body {
        margin: 0;
        padding: 0;
      }
      
      .invoice {
        max-height: 100vh;
      }
    }
  </style>
</head>
<body>

<div class="invoice">

  <!-- HEADER -->
  <div class="header no-page-break">
    <div class="company-name">KARRALI Manufacture &amp; Trader's</div>
    <div class="company-address">No 69, Palaly Road, Thirunelvely (Near Junction) Jaffna.</div>
    <div class="company-contact">Tel: 077 692 5633 &nbsp;|&nbsp; E-Mail: karralitraders@gmail.com</div>
    <div class="company-vat">VAT Reg: 102393570-7000</div>
  </div>

  <!-- INVOICE TITLE WITH INVOICE NUMBER -->
  <div class="invoice-title-row no-page-break">
    <span class="invoice-title">SALES INVOICE</span>
    <span class="invoice-number">
      <span class="label">Invoice No:</span> ${data.invoiceNumber || "N/A"}
    </span>
  </div>

  <!-- DATE & DUE DATE -->
  <div class="customer-section no-page-break">
    <div class="customer-details" style="justify-content: space-between;">
      <div class="field">
        <span class="label">Date:</span>
        <span>${dateStr}</span>
      </div>
      <div class="field">
        <span class="label">Due Date:</span>
        <span>with in 60 days</span>
      </div>
    </div>
  </div>

  <!-- CUSTOMER DETAILS -->
  <div class="customer-section no-page-break">
    <div class="label">Customer Details</div>
    <div class="customer-details">
      <div class="field">
        <span class="label">Name:</span>
        <span>${data.customerName || "Walk-in Customer"}</span>
      </div>
      <div class="field">
        <span class="label">Phone:</span>
        <span>${data.customerPhone || "-"}</span>
      </div>
      <div class="field">
        <span class="label">Address:</span>
        <span>${data.customerAddress || "-"}</span>
      </div>
    </div>
  </div>

  <!-- TABLE -->
  <div class="table-wrap no-page-break">
    <table>
      <thead>
        <tr>
          <th>S.N</th>
          <th>Description of Goods</th>
          <th>Qty</th>
          <th>Rate (LKR)</th>
          <th>Dis %</th>
          <th>Amount (LKR)</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        ${moreItemsRow}
      </tbody>
    </table>
  </div>

  <!-- AMOUNT IN WORDS -->
  <div class="words-section no-page-break">
    <span class="label">Sri Lankan Rupee:</span>
    <span>${words}</span>
  </div>

  <!-- TOTALS -->
  <div class="totals-section no-page-break">
    <table class="totals-table">
      <tr>
        <td class="label">Grand Total</td>
        <td class="value">${fmt(grandTotalWithoutDiscount)}</td>
      </tr>
      ${combinedDiscountAmount > 0 ? `
      <tr class="discount-row">
        <td class="label">Discount (-)${discountPercentApplied}%</td>
        <td class="value">(${fmt(combinedDiscountAmount)})</td>
      </tr>
      ` : ''}
      <tr class="total-row">
        <td class="label">Net Amount</td>
        <td class="value">${fmt(data.total)}</td>
      </tr>
      <tr>
        <td class="label">Paid</td>
        <td class="value">${fmt(data.paid)}</td>
      </tr>
      <tr>
        <td class="label">Balance (This Invoice)</td>
        <td class="value">${fmt(data.balance || 0)}</td>
      </tr>
      ${previousOutstanding > 0 ? `
      <tr>
        <td class="label">Previous Outstanding</td>
        <td class="value">${fmt(previousOutstanding)}</td>
      </tr>
      ` : ''}
      <tr class="total-row">
        <td class="label">Total Due</td>
        <td class="value">${fmt(totalDue)}</td>
      </tr>
    </table>
  </div>

  <!-- BANK DETAILS -->
  <div class="bank-details no-page-break">
    <span><span class="label">Bank:</span> Sampath Bank PLC</span>
    <span><span class="label">Branch:</span> Pottuvil</span>
    <span><span class="label">Account No:</span> 013010000879</span>
    <span><span class="label">Cheque Drawn to:</span> KARRALI Manufacture &amp; Trader's</span>
  </div>

  <!-- BULK DISCOUNT INFO -->
  <div class="bulk-discount-info no-page-break">
    <span class="label">💡 Bulk Discount Offers:</span>
    <span class="slab">
      <i class="fas fa-rupee-sign" style="font-size: 7pt;"></i> 
      400000 & above: <span class="highlight">3%</span>
    </span>
    <span class="slab">
      <i class="fas fa-rupee-sign" style="font-size: 7pt;"></i> 
      600000 & above: <span class="highlight">5%</span>
    </span>
  </div>

  <!-- TERMS & CONDITIONS - Tamil -->
  <div class="terms-section no-page-break">
    <div class="terms-title">கட்டுப்பாடுகள்:</div>
    <ul>
      <li>வாடிக்கையாளர் 60 நாட்களுக்குள் பணம் செலுத்த வேண்டும்</li>
      <li>வாடிக்கையாளருக்கு ஏதேனும் புகார் இருந்தால் அழைக்கவும் <span style="font-size: 10px;">0764234816</span> அல்லது <span style="font-size: 10px;">0776925633</span></li>
      <li>சரியான அளவில் மற்றும் நல்ல நிலையில் பொருட்கள் பெறப்பட்டது.</li>
    </ul>
  </div>

  <!-- SIGNATURE -->
  <div class="signature-section no-page-break">
    <div class="signature-box">
      <div class="label">Customer Name</div>
      
    </div>
    <div class="signature-box">
      <div class="label">Customer Signature & Frank</div>
     
    </div>
    <div class="signature-box">
      <div class="label">Checked By</div>
      
    </div>
    <div class="signature-box">
      <div class="label">Authorised By</div>
     
    </div>
  </div>

</div>

<script>
  window.onload = function() {
    window.print();
    setTimeout(function() { window.close(); }, 1500);
  };
</script>
</body>
</html>
  `;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const win = window.open(url, "_blank");

  if (win) {
    win.document.title = `Invoice ${data.invoiceNumber || ''}`;
  }
}