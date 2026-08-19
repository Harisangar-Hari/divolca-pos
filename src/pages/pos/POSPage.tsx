import { useEffect, useRef, useState } from "react";
import { getProductByBarcode, checkoutSale } from "../../api/posApi";
import { getProducts } from "../../api/productApi";
import { useCartStore } from "../../store/cartStore";
import { useToast } from "../../store/toastStore";
import { useBeep } from "../../hooks/useBeep";
import { printReceipt } from "../../utils/printReceipt";
import { getCustomers, createCustomer, getCustomerById, type Customer } from "../../api/customerApi";
import CustomerFormModal from "../../components/CustomerFormModal";
import CustomerSelect from "../../components/CustomerSelect";
import CustomerOutstandingDisplay from "../../components/CustomerOutstandingDisplay";

interface Product {
  id: string;
  name: string;
  barcode: string;
  price: number;
  costPrice: number;
  discount?: number;
  stockQty: number;
  warrantyMonths?: number;
  brand?: { id: string; name: string } | null;
}

export default function POSPage() {
  const [barcode, setBarcode] = useState("");
  const [search, setSearch] = useState("");
  const [cash, setCash] = useState(0);

  const [paymentMode, setPaymentMode] = useState<"cash" | "credit" | "card">("cash");

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");

  const [customerNameInput, setCustomerNameInput] = useState("");
  const [customerPhoneInput, setCustomerPhoneInput] = useState("");

  const [paidAmount, setPaidAmount] = useState(0);

  const [results, setResults] = useState<Product[]>([]);
  const [showResults, setShowResults] = useState(false);

  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);

  const [invoiceDiscountPercent, setInvoiceDiscountPercent] = useState(0);

  // Print Selection Modal States
  const [printSizeModal, setPrintSizeModal] = useState<"A4" | "Thermal" | null>(null);
  const [pendingReceiptData, setPendingReceiptData] = useState<any>(null);

  const barcodeRef = useRef<HTMLInputElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  const {
    items,
    addItem,
    removeItem,
    increaseQty,
    decreaseQty,
    clearCart,
    getTotal,
    updateItem,
  } = useCartStore();

  const { showToast } = useToast();
  const { beep } = useBeep();

  useEffect(() => {
    loadCustomers();
  }, []);

  // ✅ FIXED: Accurate math using discountPercent and discountRs
  const subTotalAfterItemDiscount = items.reduce((acc, i) => {
    const pctDisc = (i.discountPercent || 0) / 100;
    const priceAfterPercent = i.price - (i.price * pctDisc);
    const priceAfterDiscounts = Math.max(0, priceAfterPercent - (i.discountRs || 0));
    const baseTotal = priceAfterDiscounts * i.quantity;
    const addTotal = (i.additionalPrice || 0) * i.quantity;
    const deductTotal = (i.deductPrice || 0) * i.quantity;

    return acc + baseTotal + addTotal - deductTotal;
  }, 0);

  const invoiceDiscountAmount = (subTotalAfterItemDiscount * (invoiceDiscountPercent / 100));
  const total = subTotalAfterItemDiscount - invoiceDiscountAmount;

  const change = cash - total;
  const balance = total - paidAmount;

  const loadCustomers = async () => {
    try {
      const data = await getCustomers();
      setCustomers(data || []);
    } catch {
      showToast("Failed to load customers", "error");
    }
  };

  // ✅ Refresh customer data when selected customer changes or after checkout
  const refreshCustomerData = async () => {
    await loadCustomers();
    // If a customer was selected, update their balance in the UI
    if (selectedCustomerId) {
      const updatedCustomer = customers.find(c => c.id === selectedCustomerId);
      // The customers state will be updated by loadCustomers
    }
  };

  useEffect(() => {
    setSelectedCustomerId("");
    setCustomerNameInput("");
    setCustomerPhoneInput("");
  }, [paymentMode]);

  useEffect(() => {
    barcodeRef.current?.focus();
  }, []);

  useEffect(() => {
    const delay = setTimeout(async () => {
      if (!search.trim()) {
        setResults([]);
        return;
      }
      const data = await getProducts();
      const filtered = data.filter(
        (p: Product) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.barcode.includes(search)
      );
      setResults(filtered);
      setShowResults(true);
    }, 300);
    return () => clearTimeout(delay);
  }, [search]);

  const handleScan = async () => {
    if (!barcode) return;
    try {
      const product = await getProductByBarcode(barcode);

      // ✅ The product is already parsed by the API function
      // Just use it directly
      addItem({
        id: product.id,
        name: product.name,
        barcode: product.barcode,
        price: product.price, // Already a number
        costPrice: product.costPrice || 0,
        quantity: 1,
        discountRs: product.discount || 0,
      });

      beep();
      setBarcode("");
      barcodeRef.current?.focus();
    } catch (error) {
      showToast("Product not found", "error");
    }
  };

  const handleCustomerSelect = (customerId: string) => {
    setSelectedCustomerId(customerId);
    if (customerId) {
      const found = customers.find((c) => c.id === customerId);
      if (found) {
        setCustomerNameInput(found.name);
        setCustomerPhoneInput(found.phone);
      }
    } else {
      setCustomerNameInput("");
      setCustomerPhoneInput("");
    }
  };

  const handleCreateCustomer = async (formData: any) => {
    setIsCreatingCustomer(true);
    try {
      const data = await createCustomer({
        Name: formData.name,
        Phone: formData.phone,
        Email: formData.email || undefined,
        Address: formData.address || undefined,
        City: formData.city || undefined,
        State: formData.state || undefined,
        PostalCode: formData.postalCode || undefined,
        Country: formData.country || "Bangladesh",
        CompanyName: formData.companyName || undefined,
        TaxNumber: formData.taxNumber || undefined,
        CustomerType: formData.customerType || "RETAIL",
        CreditLimit: formData.creditLimit || 0,
        PaymentTerms: formData.paymentTerms || "Due on receipt",
        Notes: formData.notes || undefined,
      });

      await loadCustomers();
      setSelectedCustomerId(data.id);
      setShowCustomerModal(false);
      showToast("Customer added successfully", "success");
    } catch (error: any) {
      showToast(
        error?.response?.data?.message || "Failed to add customer",
        "error"
      );
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  const handleCheckout = async () => {
    if (items.length === 0) {
      showToast("Cart is empty", "error");
      return;
    }

    if (paymentMode === "cash" && cash < total) {
      showToast("Insufficient cash", "error");
      return;
    }

    if (paymentMode === "credit" && !selectedCustomerId) {
      showToast("Select customer", "error");
      return;
    }

    try {
      let payload: any = {
        items: items.map((i) => ({
          productId: i.id,
          quantity: i.quantity,
          discount: (i.discountRs || 0) + ((i.discountPercent || 0) / 100 * i.price),
        })),
        paidAmount: paymentMode === "cash" || paymentMode === "card" ? cash : paidAmount,
        invoiceDiscount: invoiceDiscountAmount,
        paymentMode: paymentMode,
      };

      let receiptCustomerName = "";
      let receiptCustomerPhone = "";
      let customerCreditBalance = 0;

      if (paymentMode === "credit") {
        payload.customerId = selectedCustomerId;
        payload.customerName = null;
        payload.customerPhone = null;

        const selectedCustomer = await getCustomerById(selectedCustomerId);
        receiptCustomerName = selectedCustomer?.name || "";
        receiptCustomerPhone = selectedCustomer?.phone || "";
        customerCreditBalance = selectedCustomer?.creditBalance || 0;
      } else {
        payload.customerId = null;
        payload.customerName = customerNameInput || null;
        payload.customerPhone = customerPhoneInput || null;
        receiptCustomerName = customerNameInput;
        receiptCustomerPhone = customerPhoneInput;
      }

      const res = await checkoutSale(payload);
      console.log("Checkout response:", res);

      showToast("Checkout successful", "success");

      const totalOutstanding = paymentMode === "credit"
        ? customerCreditBalance + balance
        : 0;

      setPendingReceiptData({
        invoiceNumber: res?.InvoiceNumber,
        items: items.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          price: i.price,
          discountPercent: i.discountPercent || 0,
          discountRs: i.discountRs || 0,
        })),
        total,
        paid: paymentMode === "cash" || paymentMode === "card" ? cash : paidAmount,
        change: paymentMode === "cash" ? change : 0,
        balance: paymentMode === "credit" ? balance : 0,
        paymentMode,
        customerName: receiptCustomerName,
        customerPhone: receiptCustomerPhone,
        customerAddress: selectedCustomer?.address || "",
        invoiceDiscount: invoiceDiscountPercent, // This is the percentage (e.g., 30)
        invoiceDiscountAmount: invoiceDiscountAmount,
        previousOutstanding: customerCreditBalance,

        outstandingBalance: totalOutstanding,
        totalDue: totalOutstanding,
      });

      setPrintSizeModal("Thermal");

      clearCart();
      setCash(0);
      setPaidAmount(0);
      // ✅ Don't clear selected customer immediately - we'll refresh data first
      // setSelectedCustomerId("");
      setPaymentMode("cash");
      setInvoiceDiscountPercent(0);
      setCustomerNameInput("");
      setCustomerPhoneInput("");

      // ✅ IMPORTANT: Refresh customer data after checkout to get updated balances
      await loadCustomers();

      // ✅ Clear selected customer after refresh
      setSelectedCustomerId("");

    } catch (error: any) {
      showToast(
        error?.response?.data?.message || "Checkout failed",
        "error"
      );
    }
  };

  const handlePrintComplete = () => {
    setPrintSizeModal(null);
    setPendingReceiptData(null);
  };

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-6 font-sans text-gray-900">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 max-w-[1400px] mx-auto">

        {/* LEFT COLUMN */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* SCAN */}
            <div className="bg-white border border-gray-300 rounded-sm shadow-sm p-4">
              <label className="text-xs font-bold tracking-wider text-gray-500 uppercase mb-2 block">Scan Barcode</label>
              <div className="flex items-center bg-white border border-gray-300 rounded-sm focus-within:border-[#0B6E4F] focus-within:ring-1 focus-within:ring-[#0B6E4F] transition-colors">
                <div className="pl-3 pr-2 text-gray-400">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
                    <path d="M3 5v14M7 5v14M10 5v14M14 5v10M17 5v14M21 5v14" />
                  </svg>
                </div>
                <input
                  ref={barcodeRef}
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleScan()}
                  placeholder="Ready to scan..."
                  className="w-full py-2.5 pr-3 text-sm font-mono outline-none placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* SEARCH */}
            <div className="bg-white border border-gray-300 rounded-sm shadow-sm p-4 relative">
              <label className="text-xs font-bold tracking-wider text-gray-500 uppercase mb-2 block">Find Product</label>
              <div className="flex items-center bg-white border border-gray-300 rounded-sm focus-within:border-gray-500 focus-within:ring-1 focus-within:ring-gray-500 transition-colors">
                <div className="pl-3 pr-2 text-gray-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="7" />
                    <path d="M21 21l-4.35-4.35" strokeLinecap="square" />
                  </svg>
                </div>
                <input
                  ref={searchRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full py-2.5 pr-3 text-sm outline-none placeholder:text-gray-400"
                  placeholder="Search name or barcode..."
                />
              </div>

              {/* SEARCH RESULTS DROPDOWN */}
              {showResults && results.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-300 shadow-xl max-h-72 overflow-y-auto rounded-sm z-20">
                  {results.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => {
                        addItem({
                          id: p.id,
                          name: p.name,
                          barcode: p.barcode,
                          price: p.price,
                          costPrice: p.costPrice || 0,
                          quantity: 1,
                          discountRs: p.discount || 0,
                        });
                        beep();
                        setSearch("");
                        setShowResults(false);
                        searchRef.current?.blur();
                        barcodeRef.current?.focus();
                      }}
                      className="flex items-center justify-between px-4 py-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0 transition-colors"
                    >
                      <div className="flex-1 pr-4">
                        <p className="font-semibold text-gray-800 text-sm">{p.name}</p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px]">
                          <span className="flex items-center gap-1 text-gray-400"><span className="font-mono">#{p.barcode}</span></span>
                          <span className="w-px h-3 bg-gray-300"></span>
                          <span className="text-gray-500">Stock: <span className="font-medium text-gray-700">{p.stockQty}</span></span>
                          {(p.warrantyMonths ?? 0) > 0 && (<><span className="w-px h-3 bg-gray-300"></span><span className="text-gray-500">Warranty: <span className="font-medium text-gray-700">{p.warrantyMonths}m</span></span></>)}
                          {p.brand && (<><span className="w-px h-3 bg-gray-300"></span><span className="flex items-center gap-1 text-gray-500">Brand: <span className="font-medium text-gray-700">{p.brand.name}</span></span></>)}
                        </div>
                      </div>

                      <div className="flex flex-col items-end shrink-0">
                        <span className="font-mono font-bold text-[#0B6E4F] text-sm">Rs {p.price.toFixed(2)}</span>
                        {(p.discount ?? 0) > 0 && (
                          <span className="text-[10px] font-medium text-gray-500 mt-0.5">
                            Ref Disc: -Rs {p.discount?.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* CART */}
          <div className="bg-white border border-gray-300 rounded-sm shadow-sm flex-1 flex flex-col min-h-[400px]">
            <div className="px-4 py-3 border-b border-gray-300 flex items-center justify-between bg-gray-50">
              <h2 className="text-xs font-bold tracking-wider text-gray-600 uppercase">Current Sale</h2>
              <span className="text-xs font-bold bg-gray-200 text-gray-600 px-2 py-1 rounded-sm">
                {items.length} {items.length === 1 ? "ITEM" : "ITEMS"}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {items.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm font-medium uppercase tracking-widest">
                  Cart is empty
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[700px]">
                    <thead className="text-xs text-gray-500 uppercase border-b border-gray-200">
                      <tr>
                        <th className="pb-2 font-bold text-left min-w-[140px]">Item</th>
                        <th className="pb-2 font-bold text-center w-24">Qty</th>
                        <th className="pb-2 font-bold text-center w-20">Disc %</th>
                        <th className="pb-2 font-bold text-center w-20">Disc Rs</th>
                        <th className="pb-2 font-bold text-center w-20">Add Rs</th>
                        <th className="pb-2 font-bold text-center w-20">Ded Rs</th>
                        <th className="pb-2 font-bold text-right w-24">Total</th>
                        <th className="pb-2 font-bold text-center w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((i) => {
                        const costPrice = i.costPrice || 0;
                        const unitPrice = i.price;
                        const pctDisc = i.discountPercent || 0;
                        const rsDisc = i.discountRs || 0;

                        const priceAfterPct = unitPrice - (unitPrice * (pctDisc / 100));
                        let priceAfterRs = priceAfterPct - rsDisc;
                        if (priceAfterRs < 0) priceAfterRs = 0;

                        const baseTotal = priceAfterRs * i.quantity;
                        const addTotal = (i.additionalPrice || 0) * i.quantity;
                        const deductTotal = (i.deductPrice || 0) * i.quantity;
                        const minimumLineTotal = i.costPrice * i.quantity;
                        const lineTotal = Math.max(minimumLineTotal, baseTotal + addTotal - deductTotal);

                        return (
                          <tr key={i.id} className="border-b border-gray-100 last:border-0 group hover:bg-gray-50">
                            <td className="py-3 pr-2">
                              <div className="flex flex-col">
                                <p className="font-semibold text-gray-800">{i.name}</p>
                                <div className="flex flex-wrap gap-x-2 text-xs text-gray-500 mt-0.5">
                                  <span>Sell: Rs {i.price.toFixed(2)}</span>
                                  <span className="text-gray-400">|</span>
                                  <span className="text-gray-400">Cost: Rs {costPrice.toFixed(2)}</span>
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-2 align-middle">
                              <div className="flex items-center justify-center gap-1 border border-gray-300 rounded-sm bg-white overflow-hidden w-fit mx-auto">
                                <button onClick={() => decreaseQty(i.id)} className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors">−</button>
                                <span className="w-8 text-center font-mono font-bold text-sm">{i.quantity}</span>
                                <button onClick={() => increaseQty(i.id)} className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors">+</button>
                              </div>
                            </td>

                            <td className="py-3 px-1 align-middle">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={i.discountPercent || 0}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  const newPrice = i.price - (i.price * (val / 100));
                                  if (val > 0 && newPrice < costPrice) {
                                    showToast("Cannot discount below cost price!", "error");
                                    return;
                                  }
                                  if (updateItem) {
                                    updateItem(i.id, { discountPercent: val >= 0 ? val : 0 });
                                  }
                                }}
                                className="w-full text-center text-xs border border-gray-200 rounded-sm py-1 outline-none focus:border-[#0B6E4F] font-mono"
                                placeholder="0"
                              />
                            </td>

                            <td className="py-3 px-1 align-middle">
                              <input
                                type="number"
                                min="0"
                                value={i.discountRs || 0}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  if (val < 0) return;
                                  const priceAfterPct = i.price - (i.price * ((i.discountPercent || 0) / 100));
                                  if (val > 0 && (priceAfterPct - val) < i.costPrice) {
                                    showToast("Rs discount cannot drop unit price below cost price!", "error");
                                    return;
                                  }
                                  if (updateItem) {
                                    updateItem(i.id, { discountRs: val >= 0 ? val : 0 });
                                  }
                                }}
                                className="w-full text-center text-xs border border-gray-200 rounded-sm py-1 outline-none focus:border-[#0B6E4F] font-mono"
                                placeholder="0"
                              />
                            </td>

                            <td className="py-3 px-1 align-middle">
                              <input
                                type="number"
                                min="0"
                                value={i.additionalPrice || 0}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  if (updateItem) {
                                    updateItem(i.id, { additionalPrice: val >= 0 ? val : 0 });
                                  }
                                }}
                                className="w-full text-center text-xs border border-gray-200 rounded-sm py-1 outline-none focus:border-[#0B6E4F] font-mono"
                                placeholder="0"
                              />
                            </td>

                            <td className="py-3 px-1 align-middle">
                              <input
                                type="number"
                                min="0"
                                value={i.deductPrice || 0}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  if (val < 0) return;
                                  const priceAfterPct = i.price - (i.price * ((i.discountPercent || 0) / 100));
                                  const priceAfterPctRs = Math.max(0, priceAfterPct - (i.discountRs || 0));
                                  if (val > 0 && (priceAfterPctRs - val) < i.costPrice) {
                                    showToast("Deduction cannot drop unit price below cost price!", "error");
                                    return;
                                  }
                                  if (updateItem) {
                                    updateItem(i.id, { deductPrice: val >= 0 ? val : 0 });
                                  }
                                }}
                                className="w-full text-center text-xs border border-gray-200 rounded-sm py-1 outline-none focus:border-[#0B6E4F] font-mono"
                                placeholder="0"
                              />
                            </td>

                            <td className="py-3 pl-2 text-right align-middle">
                              <span className="font-mono font-bold text-gray-900">
                                Rs {Math.max(0, lineTotal).toFixed(2)}
                              </span>
                            </td>
                            <td className="py-3 text-center align-middle">
                              <button onClick={() => removeItem(i.id)} className="text-gray-400 hover:text-red-600 transition-colors p-1" title="Remove item">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
                                  <path d="M3 6h18M8 6V4h8v2m-2 14H10a2 2 0 01-2-2V8h8v10a2 2 0 01-2 2z" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-sm p-6 shadow-inner relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-[#4ADE9A]"></div>
            <p className="text-xs font-bold tracking-widest uppercase text-gray-400">Total Due</p>
            <p className="mt-2 font-mono text-4xl md:text-5xl font-bold tabular-nums text-[#4ADE9A] tracking-tight">
              Rs {total.toFixed(2)}
            </p>
          </div>

          <div className="bg-white border border-gray-300 rounded-sm shadow-sm flex flex-col flex-1">
            <div className="px-4 py-3 border-b border-gray-300 bg-gray-50">
              <h2 className="text-xs font-bold tracking-wider text-gray-600 uppercase">Payment Details</h2>
            </div>

            <div className="p-4 space-y-5 flex-1">
              {/* TOGGLE */}
              <div className="flex border border-gray-300 rounded-sm overflow-hidden bg-gray-50">
                <button
                  onClick={() => setPaymentMode("cash")}
                  className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${paymentMode === "cash" ? "bg-[#0B6E4F] text-white" : "text-gray-600 hover:bg-gray-200"}`}
                >
                  Cash
                </button>

                <div className="w-px bg-gray-300"></div>

                <button
                  onClick={() => setPaymentMode("card")}
                  className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${paymentMode === "card" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-200"}`}
                >
                  Card
                </button>

                <div className="w-px bg-gray-300"></div>

                <button
                  onClick={() => {
                    setPaymentMode("credit");
                    if (customers.length === 0) {
                      loadCustomers();
                    }
                  }}
                  className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${paymentMode === "credit" ? "bg-gray-800 text-white" : "text-gray-600 hover:bg-gray-200"}`}
                >
                  Credit
                </button>
              </div>

              {/* INVOICE DISCOUNT % */}
              <div>
                <label className="text-xs font-bold tracking-wider text-gray-600 uppercase block mb-1.5">
                  Invoice Discount (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={invoiceDiscountPercent || ""}
                    onChange={(e) => setInvoiceDiscountPercent(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-sm text-sm font-bold outline-none focus:border-[#0B6E4F] focus:ring-1 focus:ring-[#0B6E4F] transition-colors"
                    placeholder="0%"
                  />
                  {invoiceDiscountPercent > 0 && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-[#0B6E4F] bg-green-50 px-2 py-0.5 rounded-full">
                      - Rs {invoiceDiscountAmount.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>

              {/* CASH / CARD SECTION */}
              {(paymentMode === "cash" || paymentMode === "card") && (
                <div className="space-y-4">
                  <CustomerSelect
                    customers={customers}
                    selectedCustomerId={selectedCustomerId}
                    onSelect={handleCustomerSelect}
                    onAddNew={() => setShowCustomerModal(true)}
                    label="Select Customer (Optional for receipt)"
                    placeholder="-- Select Customer --"
                    showBalance={true}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold tracking-wider text-gray-600 uppercase block mb-1.5">
                        Customer Name
                      </label>
                      <input
                        type="text"
                        value={customerNameInput}
                        onChange={(e) => {
                          setCustomerNameInput(e.target.value);
                          setSelectedCustomerId("");
                        }}
                        className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-sm text-sm outline-none focus:border-gray-500 transition-colors"
                        placeholder="Type or select above"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold tracking-wider text-gray-600 uppercase block mb-1.5">
                        Phone No
                      </label>
                      <input
                        type="text"
                        value={customerPhoneInput}
                        onChange={(e) => {
                          setCustomerPhoneInput(e.target.value);
                          setSelectedCustomerId("");
                        }}
                        className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-sm text-sm outline-none focus:border-gray-500 transition-colors"
                        placeholder="Type or select above"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold tracking-wider text-gray-600 uppercase block mb-1.5">
                      Amount Received
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-mono text-sm font-bold">Rs</span>
                      <input
                        type="number"
                        value={cash || ""}
                        onChange={(e) => setCash(Number(e.target.value))}
                        className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-300 rounded-sm font-mono text-lg font-bold outline-none focus:border-[#0B6E4F] focus:ring-1 focus:ring-[#0B6E4F] transition-colors"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center bg-gray-50 border border-gray-200 p-3 rounded-sm">
                    <span className="text-gray-600 uppercase tracking-widest text-xs font-bold">Change Due</span>
                    <span className={`font-mono font-bold text-xl ${change >= 0 ? "text-[#0B6E4F]" : "text-red-600"}`}>
                      Rs {change.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* CREDIT SECTION */}
              {paymentMode === "credit" && (
                <div className="space-y-4">
                  <CustomerSelect
                    customers={customers}
                    selectedCustomerId={selectedCustomerId}
                    onSelect={handleCustomerSelect}
                    onAddNew={() => setShowCustomerModal(true)}
                    label="Select Customer"
                    placeholder="-- Choose Customer --"
                    showBalance={true}
                  />

                  {selectedCustomerId && (
                    <CustomerOutstandingDisplay customer={selectedCustomer} />
                  )}

                  <div>
                    <label className="text-xs font-bold tracking-wider text-gray-600 uppercase block mb-1.5">Initial Payment</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-mono text-sm font-bold">Rs</span>
                      <input
                        type="number"
                        value={paidAmount || ""}
                        onChange={(e) => setPaidAmount(Number(e.target.value))}
                        className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-300 rounded-sm font-mono text-lg font-bold outline-none focus:border-gray-800 focus:ring-1 focus:ring-gray-800 transition-colors"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center bg-gray-50 border border-gray-200 p-3 rounded-sm">
                    <span className="text-gray-600 uppercase tracking-widest text-xs font-bold">Remaining Balance</span>
                    <span className={`font-mono font-bold text-xl ${balance > 0 ? "text-red-600" : "text-gray-900"}`}>
                      Rs {balance.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* CHECKOUT BUTTON */}
            <div className="p-4 border-t border-gray-300 bg-gray-50">
              <button
                onClick={handleCheckout}
                disabled={items.length === 0}
                className={`w-full py-4 text-sm font-bold uppercase tracking-widest rounded-sm transition-colors ${items.length === 0 ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-[#0B6E4F] text-white hover:bg-[#08523b] shadow-sm"}`}
              >
                Complete Sale
              </button>
            </div>
          </div>
        </div>

        {/* CUSTOMER FORM MODAL */}
        <CustomerFormModal
          isOpen={showCustomerModal}
          onClose={() => setShowCustomerModal(false)}
          onSave={handleCreateCustomer}
          isLoading={isCreatingCustomer}
        />

        {/* PRINT SIZE SELECTION MODAL */}
        {printSizeModal && pendingReceiptData && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-5">
              <h2 className="text-lg font-bold text-[#14181C]">Print Receipt</h2>
              <p className="text-sm text-black/60">Choose your printer size:</p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    import("../../utils/printReceipt").then(({ printReceipt }) => {
                      printReceipt(pendingReceiptData);
                    });
                    handlePrintComplete();
                  }}
                  className="py-3 bg-[#F3F6F4] hover:bg-gray-200 rounded-xl text-sm font-medium transition"
                >
                  🧾 Thermal
                </button>

                <button
                  onClick={() => {
                    import("../../utils/printA4Receipt").then(({ printA4Receipt }) => {
                      printA4Receipt(pendingReceiptData);
                    });
                    handlePrintComplete();
                  }}
                  className="py-3 bg-[#0B6E4F] text-white hover:bg-[#0A5F44] rounded-xl text-sm font-medium transition"
                >
                  📄 A4 Invoice
                </button>
              </div>

              <button
                onClick={handlePrintComplete}
                className="w-full mt-2 text-sm text-black/40 hover:text-black/70 transition"
              >
                Skip Printing
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}