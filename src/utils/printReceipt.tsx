// PrintReceipt.ts
import logoSrc from "../assets/logo.jpeg";

export interface PrintItem {
  name: string;
  quantity: number;
  price: number;
  discount?: number;
  discountPercent?: number;
  discountRs?: number;
}

export interface ReceiptData {
  invoiceNumber?: string;
  items: PrintItem[];
  customerName?: string;
  customerPhone?: string;
  total: number;
  paid: number;
  change?: number;
  balance?: number;
  paymentMode: "cash" | "credit" | "card";
  invoiceDiscount?: number;
  outstandingBalance?: number;
  totalDue?: number;
}

function imageToBase64(src: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext("2d")!.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.onerror = () => resolve("");
    img.src = src;
  });
}

function buildHTML(data: ReceiptData, logoB64: string): string {
  const now = new Date().toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  let totalItemDiscount = 0;
  let grandTotalWithoutDiscount = 0;

  const rows = data.items.map((i) => {
    const pctDiscount = (i.discountPercent || 0) / 100;
    const priceAfterPct = i.price - (i.price * pctDiscount);
    const rsDiscount = i.discountRs || 0;
    const discountedPrice = Math.max(0, priceAfterPct - rsDiscount);
    const realUnitDiscount = i.price - discountedPrice;
    const lineFinalTotal = i.price * i.quantity; // ✅ Unit price * quantity (not discounted)

    totalItemDiscount += (realUnitDiscount * i.quantity);
    grandTotalWithoutDiscount += (i.price * i.quantity);

    return `
      <tr>
        <td colspan="2" class="item-name">${i.name}</td>
      </tr>
      ${realUnitDiscount > 0 ? `
      <tr>
        <td colspan="2" class="item-discount">Disc: -Rs ${(realUnitDiscount * i.quantity).toFixed(2)}</td>
      </tr>
      ` : ''}
      <tr>
        <td class="qty">${i.quantity} x ${i.price.toFixed(2)}</td>
        <td class="amount">${lineFinalTotal.toFixed(2)}</td>
      </tr>
    `;
  }).join("");

  const invoiceDiscount = data.invoiceDiscount || 0;
  const combinedTotalDiscount = totalItemDiscount + invoiceDiscount;

  const totalOutstanding = data.totalDue ?? data.outstandingBalance ?? 0;

  const payRow = data.paymentMode === "cash" || data.paymentMode === "card"
    ? `<tr><td class="sum-label">Change</td><td class="sum-amount">Rs ${(data.change ?? 0).toFixed(2)}</td></tr>`
    : `<tr><td class="sum-label">Balance (This Invoice)</td><td class="sum-amount">Rs ${(data.balance ?? 0).toFixed(2)}</td></tr>`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @page { size: 72mm auto; margin: 2mm; }
  html, body {
    width: 72mm;
    font-family: 'Courier New', Courier, monospace;
    font-size: 14px;
    line-height: 1.5;
    color: #000 !important;
    background: #fff !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    font-weight: bold;
  }
  .page { padding: 2mm 2mm 8mm 2mm; }
  .logo { display: block; width: 60px; height: auto; margin: 0 auto 4px; }
  .shop-name { text-align: center; font-size: 16px; font-weight: bold; margin-bottom: 2px; }
  .meta { text-align: left; font-size: 12px; line-height: 1.4; }
  .meta-row { display: flex; justify-content: space-between; padding: 1px 0; }
  .meta-label { text-align: left; }
  .meta-value { text-align: right; }
  .div { width: 100%; border: none; border-top: 2px solid #000; margin: 4px 0; }
  .div-dashed { width: 100%; border: none; border-top: 1px dashed #000; margin: 4px 0; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  td { padding: 2px 0; font-size: 13px; font-weight: bold; }
  .item-name { font-size: 14px; font-weight: bold; }
  .item-discount { font-size: 11px; color: #d32f2f; padding-bottom: 1px; }
  .qty    { width: 58%; font-size: 13px; font-weight: bold; }
  .amount { width: 42%; text-align: right; font-size: 13px; font-weight: bold; }
  .sum-label  { width: 55%; font-size: 13px; font-weight: bold; }
  .sum-amount { width: 45%; text-align: right; font-size: 13px; font-weight: bold; }
  .total-row td { font-size: 15px; font-weight: bold; padding-top: 3px; }
  .discount-row td { font-size: 13px; color: #d32f2f; font-weight: bold; padding-top: 2px; }
  .outstanding-row td { font-size: 14px; font-weight: bold; color: #d32f2f; padding-top: 4px; border-top: 2px solid #000; }
  .footer { text-align: center; font-size: 12px; font-weight: bold; margin-top: 3px; }
  .footer-brand { margin-top: 6px; font-size: 10px; }
  .center-text { text-align: center; }
</style>
</head>
<body>
<div class="page">

  ${logoB64 ? `<img class="logo" src="${logoB64}" />` : ""}
  <p class="shop-name">Karrali Manufacture &amp; Traders</p>
  <p class="meta center-text">No 69, Palaly Road, Thirunelveli, Jaffna</p>
  <p class="meta center-text">Tel: 0776925633</p>
  <hr class="div">
  
  <div class="meta">
    <div class="meta-row">
      <span class="meta-label">Invoice:</span>
      <span class="meta-value">${data.invoiceNumber || ""}</span>
    </div>
    <div class="meta-row">
      <span class="meta-label">Date:</span>
      <span class="meta-value">${now}</span>
    </div>
    <div class="meta-row">
      <span class="meta-label">Cashier:</span>
      <span class="meta-value">M. Thivaharan</span>
    </div>
    ${data.customerName ? `
    <div class="meta-row">
      <span class="meta-label">Customer:</span>
      <span class="meta-value">${data.customerName}</span>
    </div>
    ` : ''}
    ${data.customerPhone ? `
    <div class="meta-row">
      <span class="meta-label">Phone:</span>
      <span class="meta-value">${data.customerPhone}</span>
    </div>
    ` : ''}
  </div>
  
  <hr class="div-dashed">

  <table><tbody>${rows}</tbody></table>

  <hr class="div-dashed">

  <table>
    <tbody>
      <tr>
        <td class="sum-label">Total Amount</td>
        <td class="sum-amount">Rs ${grandTotalWithoutDiscount.toFixed(2)}</td>
      </tr>

      ${combinedTotalDiscount > 0 ? `
      <tr class="discount-row">
        <td class="sum-label">Total Discount</td>
        <td class="sum-amount">-Rs ${combinedTotalDiscount.toFixed(2)}</td>
      </tr>
      ` : ''}

      <tr class="total-row">
        <td class="sum-label">Net Amount</td>
        <td class="sum-amount">Rs ${data.total.toFixed(2)}</td>
      </tr>
      
      <tr>
        <td class="sum-label">Paid</td>
        <td class="sum-amount">Rs ${data.paid.toFixed(2)}</td>
      </tr>
      ${payRow}

      ${data.paymentMode === "credit" ? `
      <tr class="outstanding-row">
        <td class="sum-label">Total Outstanding</td>
        <td class="sum-amount">Rs ${totalOutstanding.toFixed(2)}</td>
      </tr>
      ${data.balance && data.balance > 0 ? `
      <tr style="font-size: 11px; color: #666; font-weight: bold;">
        <td colspan="2" class="center-text">Includes this invoice: Rs ${data.balance.toFixed(2)}</td>
      </tr>
      ` : ''}
      ` : ''}
    </tbody>
  </table>

  <hr class="div">
  <p class="footer">No Return &bull; No Cash Refund</p>
  <p class="footer">Thank You! Come Again</p>
  <p class="footer footer-brand">Powered by MYLInnovations Developers</p>

</div>
<script>
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      window.print();
      setTimeout(function() { window.close(); }, 1500);
    });
  });
</script>
</body>
</html>`;
}

export async function printReceipt(data: ReceiptData): Promise<void> {
  const logoB64 = await imageToBase64(logoSrc);
  const html = buildHTML(data, logoB64);

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const win = window.open(url, "_blank");

  if (win) {
    win.addEventListener("load", () => {
      URL.revokeObjectURL(url);
    });
  }
}