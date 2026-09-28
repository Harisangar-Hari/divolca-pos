// src/utils/printReturnReceipt.ts
import logo from "../assets/logo.jpeg";

interface Item {
  name: string;
  quantity: number;
  price: number;
}

interface ReturnReceiptData {
  invoiceNumber: string;
  newInvoiceNumber?: string;

  returnedItems: Item[];
  replacementItems: Item[];

  returnedTotal: number;
  replacementTotal: number;
  balance: number;

  reason?: string;
  customerName?: string;
  customerPhone?: string;
}

// ── Helpers ────────────────────────────────────────────────────────
function fmt(n: number): string {
  return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export const printReturnReceipt = (data: ReturnReceiptData) => {
  const win = window.open("", "_blank", "width=400,height=650");
  if (!win) return;

  const now = new Date().toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const html = `
  <html>
  <head>
    <title>Return Receipt</title>

    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }

      body {
        font-family: 'Courier New', Courier, monospace;
        padding: 10px;
        font-size: 12px;
        line-height: 1.4;
        color: #000;
      }

      .center { text-align: center; }
      .row { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; padding: 1px 0; }
      .row span:first-child { flex-shrink: 0; }
      .row span:last-child { text-align: right; }
      .bold { font-weight: bold; }

      hr {
        border: none;
        border-top: 1px dashed #000;
        margin: 8px 0;
      }

      .logo {
        width: 80px;
        height: auto;
        margin-bottom: 4px;
      }

      .green { color: green; }
      .red { color: red; }

      .section-title {
        font-weight: bold;
        font-size: 11px;
        letter-spacing: 0.5px;
        margin-bottom: 4px;
      }

      .meta {
        font-size: 11px;
        color: #333;
        margin-top: 2px;
      }

      .footer {
        margin-top: 15px;
        text-align: center;
        font-size: 11px;
        line-height: 1.5;
      }

      .footer-line {
        margin-top: 2px;
      }

      .balance-row {
        font-size: 14px;
        font-weight: bold;
        padding: 4px 0;
      }

      @media print {
        body { padding: 4px; }
      }
    </style>
  </head>

  <body>

    <!-- HEADER -->
    <div class="center">
      <img src="${logo}" class="logo" />
      <h3 style="font-size:14px; letter-spacing:1px;">MYL POS SYSTEM</h3>
      <div style="font-size:11px;">RETURN / EXCHANGE RECEIPT</div>
      <div class="meta">${now}</div>
    </div>

    <hr />

    <!-- INVOICE INFO -->
    <div>
      <div class="row">
        <span>Invoice</span>
        <span class="bold">${data.invoiceNumber}</span>
      </div>

      ${data.newInvoiceNumber
      ? `<div class="row"><span>New Invoice</span><span class="bold">${data.newInvoiceNumber}</span></div>`
      : ""
    }

      <div class="row">
        <span>Customer</span>
        <span>${data.customerName || "Walk-in Customer"}</span>
      </div>

      ${data.customerPhone
      ? `<div class="row"><span>Phone</span><span>${data.customerPhone}</span></div>`
      : ""
    }

      ${data.reason
      ? `<div class="row"><span>Reason</span><span>${data.reason}</span></div>`
      : ""
    }
    </div>

    <hr />

    <!-- RETURNED ITEMS -->
    <div class="section-title red">RETURNED ITEMS (−)</div>
    ${data.returnedItems.length === 0
      ? `<div style="font-size:11px; color:#999; padding:2px 0;">No items returned</div>`
      : data.returnedItems
        .map(
          (i) => `
      <div class="row red">
        <span>${i.name} (${i.quantity} × ${fmt(i.price)})</span>
        <span>− ${fmt(i.quantity * i.price)}</span>
      </div>
    `
        )
        .join("")
    }

    <hr />

    <!-- REPLACEMENT ITEMS -->
    <div class="section-title green">REPLACEMENT ITEMS (+)</div>
    ${data.replacementItems.length === 0
      ? `<div style="font-size:11px; color:#999; padding:2px 0;">No replacement items</div>`
      : data.replacementItems
        .map(
          (i) => `
      <div class="row green">
        <span>${i.name} (${i.quantity} × ${fmt(i.price)})</span>
        <span>+ ${fmt(i.quantity * i.price)}</span>
      </div>
    `
        )
        .join("")
    }

    <hr />

    <!-- SUMMARY -->
    <div class="row">
      <span>Return Total</span>
      <span class="red">− ${fmt(data.returnedTotal)}</span>
    </div>

    <div class="row">
      <span>Replacement Total</span>
      <span class="green">+ ${fmt(data.replacementTotal)}</span>
    </div>

    <hr />

    <div class="row balance-row">
      <span>Balance</span>
      <span>${fmt(data.balance)}</span>
    </div>

    <hr />

    <!-- FOOTER -->
    <div class="footer">
      <div>No Return • No Cash Refund</div>
      <div class="footer-line">Thank You! Come Again</div>
      <div class="footer-line" style="font-size:10px; color:#666; margin-top:6px;">
        System Designed by MYLTech Developers
      </div>
    </div>

  </body>
  </html>
  `;

  win.document.write(html);
  win.document.close();
  win.print();
};