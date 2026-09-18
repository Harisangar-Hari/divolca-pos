//src/pages/pos/ReturnPOSPage.tsx
import { useState } from "react";
import { api } from "../../services/api";
import { getProducts } from "../../api/productApi";
import { useToast } from "../../store/toastStore";
import { printReturnReceipt } from "../../utils/printReturnReceipt";

interface InvoiceItem {
    productId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
    discount?: number;
}

interface ReturnItem {
    productId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
    reason?: string;
}

interface ReplacementItem {
    productId: string;
    name: string;
    quantity: number;
    price: number;
}

export default function ReturnPOSPage() {
    const [invoiceNumber, setInvoiceNumber] = useState("");
    const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
    const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
    const [replacementItems, setReplacementItems] = useState<ReplacementItem[]>([]);
    const [reason, setReason] = useState("");
    const [invoiceDiscount, setInvoiceDiscount] = useState(0);
    const [subTotal, setSubTotal] = useState(0);

    const [search, setSearch] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [showResults, setShowResults] = useState(false);
    const [loading, setLoading] = useState(false);
    const [totalAmount, setTotalAmount] = useState(0);

    const { showToast } = useToast();

    // =========================
    // LOAD INVOICE
    // =========================
    const loadInvoice = async () => {
        if (!invoiceNumber.trim()) {
            showToast("Enter invoice number", "error");
            return;
        }

        try {
            setLoading(true);
            const res = await api.get(`/sales/invoice/${invoiceNumber}`);
            const data = res.data;

            const items = data?.SaleItems ?? [];
            const subTotalAmount = Number(data?.SubTotal || 0);
            const discountAmount = Number(data?.InvoiceDiscount || 0);

            setSubTotal(subTotalAmount);
            setInvoiceDiscount(discountAmount);
            const totalAmountValue = Number(data?.TotalAmount || 0);
            setTotalAmount(totalAmountValue);

            const safeItems: InvoiceItem[] = items.map((i: any) => ({
                productId: i.ProductId,
                name: i.Products?.Name ?? "Unknown Product",
                quantity: i.Quantity ?? 0,
                unitPrice: Number(i.UnitPrice ?? 0),
                total: Number(i.Total ?? 0),
                discount: Number(i.Discount ?? 0),
            }));

            setInvoiceItems(safeItems);
            setReturnItems([]);
            setReplacementItems([]);
            showToast("Invoice loaded successfully", "success");
        } catch (error: any) {
            showToast(
                error?.response?.data?.message || "Invoice not found",
                "error"
            );
        } finally {
            setLoading(false);
        }
    };

    // =========================
    // RETURN ITEM
    // =========================
    const addReturnItem = (item: InvoiceItem, qty: number) => {
        if (!qty || qty <= 0) {
            setReturnItems(prev => prev.filter(p => p.productId !== item.productId));
            return;
        }

        // ✅ Correct invoice discount rate
        // Base = TotalAmount + InvoiceDiscount (after-item-discount subtotal)
        const base = totalAmount + invoiceDiscount;
        const invoiceDiscountRate = base > 0 ? invoiceDiscount / base : 0;

        // ✅ Per-unit item discount
        const perUnitItemDiscount =
            item.quantity > 0 ? (item.discount || 0) / item.quantity : 0;

        // ✅ Refund = (unitPrice − perUnitItemDiscount) × qty × (1 − invoiceDiscountRate)
        const refundAmount =
            (item.unitPrice - perUnitItemDiscount) * qty * (1 - invoiceDiscountRate);

        setReturnItems(prev => {
            const exists = prev.find(p => p.productId === item.productId);

            if (exists) {
                return prev.map(p =>
                    p.productId === item.productId
                        ? {
                            ...p,
                            quantity: qty,
                            total: refundAmount,
                            reason: reason || p.reason,
                        }
                        : p
                );
            }

            return [
                ...prev,
                {
                    productId: item.productId,
                    name: item.name,
                    quantity: qty,
                    unitPrice: item.unitPrice,
                    total: refundAmount,
                    reason: reason || undefined,
                },
            ];
        });
    };

    const removeReturn = (id: string) => {
        setReturnItems(prev => prev.filter(i => i.productId !== id));
    };

    // =========================
    // SEARCH PRODUCTS
    // =========================
    const handleSearch = async (value: string) => {
        setSearch(value);

        if (!value.trim()) {
            setResults([]);
            setShowResults(false);
            return;
        }

        try {
            const data = await getProducts();
            const filtered = data.filter((p: any) =>
                p.name?.toLowerCase().includes(value.toLowerCase()) ||
                p.barcode?.includes(value)
            );
            setResults(filtered);
            setShowResults(true);
        } catch (error) {
            console.error("Search failed:", error);
        }
    };

    // =========================
    // REPLACEMENT
    // =========================
    const addReplacement = (product: any) => {
        setReplacementItems(prev => {
            const exists = prev.find(p => p.productId === product.id);

            if (exists) {
                return prev.map(p =>
                    p.productId === product.id
                        ? { ...p, quantity: p.quantity + 1 }
                        : p
                );
            }

            return [
                ...prev,
                {
                    productId: product.id,
                    name: product.name,
                    quantity: 1,
                    price: product.price,
                }
            ];
        });
    };

    const updateReplacementQty = (id: string, qty: number) => {
        if (!qty || qty <= 0) {
            setReplacementItems(prev => prev.filter(i => i.productId !== id));
            return;
        }

        setReplacementItems(prev =>
            prev.map(i =>
                i.productId === id ? { ...i, quantity: qty } : i
            )
        );
    };

    const removeReplacement = (id: string) => {
        setReplacementItems(prev => prev.filter(i => i.productId !== id));
    };

    // =========================
    // CALCULATION
    // =========================
    const returnTotal = returnItems.reduce(
        (sum, i) => sum + (i.total || 0),
        0
    );

    const replacementTotal = replacementItems.reduce(
        (sum, i) => sum + (i.price || 0) * (i.quantity || 0),
        0
    );

    const balance = replacementTotal - returnTotal;

    // =========================
    // PROCESS EXCHANGE
    // =========================
    const processExchange = async () => {
        try {
            if (!invoiceNumber) {
                showToast("Enter invoice number", "error");
                return;
            }

            if (returnItems.length === 0 && replacementItems.length === 0) {
                showToast("Nothing to process", "error");
                return;
            }

            setLoading(true);

            let returnResult = null;

            // Process returns
            if (returnItems.length > 0) {
                const returnPayload = {
                    invoiceNumber,
                    reason: reason || "Return",
                    items: returnItems.map(item => ({
                        productId: item.productId,
                        quantity: item.quantity,
                        reason: item.reason || reason || "Return",
                    })),
                };

                const res = await api.post("/sales/return", returnPayload);
                returnResult = res.data;
                showToast(`Return processed: Rs ${returnResult.refund.toFixed(2)}`, "success");
            }

            // Process replacement
            let replacementInvoice = null;
            if (replacementItems.length > 0) {
                const res = await api.post("/sales/replacement", {
                    items: replacementItems.map(item => ({
                        productId: item.productId,
                        quantity: item.quantity,
                    })),
                });
                replacementInvoice = res.data.invoiceNumber;
                showToast(`Replacement created: ${replacementInvoice}`, "success");
            }

            // Print return receipt
            printReturnReceipt({
                invoiceNumber,
                newInvoiceNumber: replacementInvoice || undefined,
                returnedItems: returnItems.map(i => ({
                    name: i.name,
                    quantity: i.quantity,
                    price: i.unitPrice,
                    total: i.total,
                })),
                replacementItems: replacementItems.map(i => ({
                    name: i.name,
                    quantity: i.quantity,
                    price: i.price,
                })),
                returnedTotal: returnTotal,
                replacementTotal: replacementTotal,
                balance,
                reason: reason || "Exchange",
            });

            // Reset form
            setInvoiceNumber("");
            setInvoiceItems([]);
            setReturnItems([]);
            setReplacementItems([]);
            setSearch("");
            setReason("");
            setInvoiceDiscount(0);
            setTotalAmount(0);
            setSubTotal(0);

            showToast("Exchange completed successfully", "success");
        } catch (error: any) {
            const message =
                error?.response?.data?.message ||
                error?.message ||
                "Something went wrong";
            showToast(message, "error");
            console.error("Exchange error:", error);
        } finally {
            setLoading(false);
        }
    };

    // =========================
    // UI
    // =========================
    return (
        <div className="min-h-screen bg-[#EEF1EF] p-4 md:p-6 font-sans text-[#14181C]">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 max-w-7xl mx-auto">

                {/* INVOICE SECTION */}
                <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-4 relative overflow-hidden">
                    <div className="absolute left-0 top-0 h-full w-1 bg-[#DC2626]" />

                    <h2 className="text-[11px] font-semibold tracking-widest text-[#DC2626] uppercase">
                        Invoice
                    </h2>

                    <div className="mt-2 flex items-center gap-2 rounded-xl border border-black/10 bg-[#FAFAF8] focus-within:ring-2 focus-within:ring-[#DC2626]/30 focus-within:border-[#DC2626] transition">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" className="ml-3 shrink-0 text-[#DC2626]/70">
                            <path d="M6 2h9l3 3v17H6V2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                            <path d="M9 9h6M9 13h6M9 17h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                        </svg>
                        <input
                            className="w-full py-3 pr-3 bg-transparent font-mono text-[15px] cursor-text outline-none placeholder:text-black/30"
                            value={invoiceNumber}
                            onChange={(e) => setInvoiceNumber(e.target.value)}
                            placeholder="Invoice number"
                            onKeyDown={(e) => e.key === "Enter" && loadInvoice()}
                            disabled={loading}
                        />
                        {loading && (
                            <div className="pr-3">
                                <div className="animate-spin h-5 w-5 border-2 border-[#DC2626] border-t-transparent rounded-full" />
                            </div>
                        )}
                    </div>

                    <button
                        onClick={loadInvoice}
                        disabled={loading}
                        className="bg-[#4338CA] hover:bg-[#372FA6] text-white w-full mt-3 p-3 rounded-xl font-medium text-[14px] cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Loading..." : "Load invoice"}
                    </button>

                    {/* Invoice Summary */}
                    {invoiceItems.length > 0 && (
                        <div className="mt-3 p-2 bg-gray-50 rounded-xl text-[12px] text-black/60">
                            <div className="flex justify-between">
                                <span>Items: {invoiceItems.length}</span>
                                <span>Subtotal: Rs {subTotal.toFixed(2)}</span>
                                {invoiceDiscount > 0 && (
                                    <span className="text-red-500">Discount: -Rs {invoiceDiscount.toFixed(2)}</span>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="mt-4 space-y-2.5 max-h-[400px] overflow-y-auto">
                        {invoiceItems.length === 0 ? (
                            <div className="py-10 text-center text-black/30 text-sm">
                                Load an invoice to see its items
                            </div>
                        ) : (
                            invoiceItems.map(item => {
                                const returnedQty = returnItems.find(
                                    r => r.productId === item.productId
                                )?.quantity || 0;

                                // const maxReturn = item.quantity - returnedQty;

                                return (
                                    <div key={item.productId} className="border border-black/10 rounded-xl p-3 hover:bg-gray-50 transition">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <p className="font-medium text-[14px]">{item.name}</p>
                                                <div className="flex gap-3 text-[11px] font-mono text-black/40">
                                                    <span>Sold: {item.quantity}</span>
                                                    <span>Unit: Rs {item.unitPrice}</span>
                                                    <span>Total: Rs {item.total}</span>
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-mono text-black/30">
                                                {returnedQty > 0 ? `Returned: ${returnedQty}` : ''}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2 mt-2">
                                            <label className="text-[11px] font-semibold tracking-widest text-black/40 uppercase shrink-0">
                                                Return qty
                                            </label>
                                            <input
                                                type="number"
                                                min={0}
                                                max={item.quantity}
                                                value={returnedQty || ''}
                                                className="border border-black/10 bg-[#FAFAF8] rounded-lg px-2 py-1.5 w-20 font-mono text-[13px] outline-none focus:ring-2 focus:ring-[#DC2626]/30 focus:border-[#DC2626] transition"
                                                onChange={(e) => {
                                                    const val = parseInt(e.target.value) || 0;
                                                    if (val >= 0 && val <= item.quantity) {
                                                        addReturnItem(item, val);
                                                    }
                                                }}
                                            />
                                            <span className="text-[11px] text-black/40">of {item.quantity}</span>

                                            {returnedQty > 0 && (
                                                <button
                                                    onClick={() => removeReturn(item.productId)}
                                                    className="ml-auto text-red-500/80 hover:text-red-600 text-[12px] font-medium cursor-pointer transition"
                                                >
                                                    Remove
                                                </button>
                                            )}
                                        </div>

                                        {returnedQty > 0 && (
                                            <div className="mt-1 text-[11px] text-green-600">
                                                Refund: Rs {returnItems.find(r => r.productId === item.productId)?.total?.toFixed(2) || '0.00'}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* REPLACEMENT SECTION */}
                <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-4 relative">
                    <h2 className="text-[11px] font-semibold tracking-widest text-[#0B6E4F] uppercase">
                        Replacement
                    </h2>

                    <div className="mt-2 flex items-center gap-2 rounded-xl border border-black/10 bg-[#FAFAF8] focus-within:ring-2 focus-within:ring-[#0B6E4F]/30 focus-within:border-[#0B6E4F] transition">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" className="ml-3 shrink-0 text-black/35">
                            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
                            <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        </svg>
                        <input
                            className="w-full py-3 pr-3 bg-transparent text-[15px] cursor-text outline-none placeholder:text-black/30"
                            value={search}
                            onChange={(e) => handleSearch(e.target.value)}
                            placeholder="Search products for replacement"
                        />
                    </div>

                    {showResults && results.length > 0 && (
                        <div className="border border-black/10 mt-1 max-h-44 overflow-y-auto rounded-xl shadow-lg bg-white">
                            {results.map(p => (
                                <div
                                    key={p.id}
                                    onClick={() => {
                                        addReplacement(p);
                                        setSearch("");
                                        setShowResults(false);
                                    }}
                                    className="px-4 py-3 hover:bg-[#F3F6F4] cursor-pointer transition border-b border-black/5 last:border-0 text-[14px] flex justify-between"
                                >
                                    <span>{p.name}</span>
                                    <span className="font-mono text-[#0B6E4F]">Rs {p.price}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="mt-4 space-y-2.5 max-h-[400px] overflow-y-auto">
                        {replacementItems.length === 0 ? (
                            <div className="py-10 text-center text-black/30 text-sm">
                                Search and select items to add as replacement
                            </div>
                        ) : (
                            replacementItems.map(item => (
                                <div key={item.productId} className="border border-black/10 rounded-xl p-3 flex items-center justify-between hover:bg-gray-50 transition">
                                    <div>
                                        <p className="font-medium text-[14px]">{item.name}</p>
                                        <p className="font-mono text-[12px] text-black/40 mt-0.5">Rs {item.price}</p>
                                    </div>

                                    <div className="flex gap-2 items-center">
                                        <button
                                            onClick={() => updateReplacementQty(item.productId, item.quantity - 1)}
                                            className="w-6 h-6 flex items-center justify-center bg-[#F3F6F4] text-black/60 rounded-full hover:bg-[#E7ECE9] cursor-pointer transition text-sm leading-none"
                                        >
                                            −
                                        </button>

                                        <span className="w-5 text-center font-mono text-[13px]">{item.quantity}</span>

                                        <button
                                            onClick={() => updateReplacementQty(item.productId, item.quantity + 1)}
                                            className="w-6 h-6 flex items-center justify-center bg-[#F3F6F4] text-black/60 rounded-full hover:bg-[#E7ECE9] cursor-pointer transition text-sm leading-none"
                                        >
                                            +
                                        </button>

                                        <button
                                            onClick={() => removeReplacement(item.productId)}
                                            className="ml-1 text-red-400 hover:text-red-600 text-[12px] cursor-pointer transition"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* SUMMARY SECTION */}
                <div className="space-y-5">

                    <div className="bg-[#12171A] rounded-2xl p-5 shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] tracking-widest uppercase text-white/40 font-semibold">
                                Return Total
                            </span>
                            <span className="font-mono text-[15px] tabular-nums text-white/70">
                                Rs {returnTotal.toFixed(2)}
                            </span>
                        </div>

                        <div className="flex items-center justify-between">
                            <span className="text-[11px] tracking-widest uppercase text-white/40 font-semibold">
                                Replacement Total
                            </span>
                            <span className="font-mono text-[15px] tabular-nums text-white/70">
                                Rs {replacementTotal.toFixed(2)}
                            </span>
                        </div>

                        {returnItems.length > 0 && (
                            <div className="text-[10px] text-white/30 border-t border-white/10 pt-2 mt-1">
                                <p className="font-semibold mb-1">Return Breakdown:</p>
                                {returnItems.map(item => (
                                    <div key={item.productId} className="flex justify-between text-[10px]">
                                        <span>{item.name} × {item.quantity}</span>
                                        <span>Rs {item.total?.toFixed(2) || '0.00'}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="h-px bg-white/10" />

                        <div>
                            <p className="text-[11px] tracking-widest uppercase text-white/40 font-semibold">
                                Balance {balance > 0 ? "due from customer" : balance < 0 ? "owed to customer" : ""}
                            </p>
                            <p
                                className={`mt-1 font-mono text-4xl font-semibold tabular-nums ${balance > 0
                                    ? "text-[#F87171] [text-shadow:0_0_18px_rgba(248,113,113,0.35)]"
                                    : balance < 0
                                        ? "text-[#4ADE9A] [text-shadow:0_0_18px_rgba(74,222,154,0.35)]"
                                        : "text-white/50"
                                    }`}
                            >
                                Rs {balance.toFixed(2)}
                            </p>
                            {balance === 0 && (
                                <p className="text-[11px] text-white/30 mt-1">✅ Balanced exchange</p>
                            )}
                        </div>
                    </div>

                    <div className="bg-white p-4 border border-black/5 rounded-2xl shadow-sm space-y-3">
                        <label className="text-[11px] font-semibold tracking-widest text-black/40 uppercase">
                            Reason for Return/Exchange
                        </label>
                        <textarea
                            className="w-full border border-black/10 bg-[#FAFAF8] rounded-xl p-3 text-[14px] outline-none focus:ring-2 focus:ring-black/10 transition resize-none"
                            rows={3}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Why is this being returned or exchanged?"
                        />

                        <button
                            onClick={processExchange}
                            disabled={loading || (returnItems.length === 0 && replacementItems.length === 0)}
                            className={`w-full p-3.5 rounded-xl font-semibold tracking-wide cursor-pointer transition shadow-sm ${loading || (returnItems.length === 0 && replacementItems.length === 0)
                                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                : "bg-[#0B6E4F] hover:bg-[#0A5F44] text-white"
                                }`}
                        >
                            {loading ? "Processing..." : "Process Exchange"}
                        </button>

                        {/* Summary of what will happen */}
                        {(returnItems.length > 0 || replacementItems.length > 0) && (
                            <div className="text-[10px] text-black/40 border-t border-black/5 pt-2 mt-1">
                                {returnItems.length > 0 && (
                                    <p>📤 Returning {returnItems.length} item(s)</p>
                                )}
                                {replacementItems.length > 0 && (
                                    <p>📥 Adding {replacementItems.length} replacement item(s)</p>
                                )}
                                {returnItems.length > 0 && replacementItems.length > 0 && (
                                    <p className="text-[9px] text-black/30 mt-0.5">
                                        * Invoice discount will be prorated on returns
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}