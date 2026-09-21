import { useEffect, useMemo, useRef, useState } from "react";

interface Customer {
    id: string;
    name: string;
    phone: string;
    creditBalance?: number;
}

interface CustomerSelectProps {
    customers: Customer[];
    selectedCustomerId: string;
    onSelect: (customerId: string) => void;
    onAddNew: () => void;
    label?: string;
    placeholder?: string;
    showBalance?: boolean;
}

export default function CustomerSelect({
    customers,
    selectedCustomerId,
    onSelect,
    onAddNew,
    label = "Select Customer",
    placeholder = "-- Choose Customer --",
    showBalance = true,
}: CustomerSelectProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);

    const selectedCustomer = useMemo(
        () => customers.find((c) => c.id === selectedCustomerId) || null,
        [customers, selectedCustomerId]
    );

    // Sync the input text with the selected customer when not actively searching
    useEffect(() => {
        if (!open) {
            setQuery(selectedCustomer ? selectedCustomer.name : "");
        }
    }, [selectedCustomer, open]);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(e.target as Node)
            ) {
                setOpen(false);
                setQuery(selectedCustomer ? selectedCustomer.name : "");
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, [selectedCustomer]);

    // Filter customers by name or phone
    const filtered = useMemo(() => {
        const q = query.toLowerCase().trim();
        if (!q) return customers;
        return customers.filter(
            (c) =>
                c.name.toLowerCase().includes(q) ||
                c.phone.includes(q)
        );
    }, [customers, query]);

    // Reset highlight when list changes
    useEffect(() => {
        setHighlightedIndex(0);
    }, [query, open]);

    const handleSelect = (customer: Customer) => {
        onSelect(customer.id);
        setQuery(customer.name);
        setOpen(false);
        inputRef.current?.blur();
    };

    const handleClear = () => {
        onSelect("");
        setQuery("");
        setOpen(false);
        inputRef.current?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
            setOpen(true);
            return;
        }

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlightedIndex((prev) =>
                prev < filtered.length - 1 ? prev + 1 : prev
            );
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        } else if (e.key === "Enter") {
            e.preventDefault();
            const pick = filtered[highlightedIndex];
            if (pick) handleSelect(pick);
        } else if (e.key === "Escape") {
            setOpen(false);
            setQuery(selectedCustomer ? selectedCustomer.name : "");
            inputRef.current?.blur();
        }
    };

    return (
        <div ref={containerRef} className="relative">
            <div className="flex justify-between items-end mb-1.5">
                <label className="text-xs font-bold tracking-wider text-gray-600 uppercase block">
                    {label}
                </label>
                <button
                    type="button"
                    onClick={onAddNew}
                    className="text-gray-600 text-xs font-bold uppercase tracking-wider hover:text-gray-900 flex items-center gap-1"
                >
                    <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <path d="M12 5v14M5 12h14" />
                    </svg>
                    New
                </button>
            </div>

            {/* Input */}
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        if (!open) setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-sm text-sm outline-none focus:border-gray-800 focus:ring-1 focus:ring-gray-800 transition-colors pr-16"
                />

                {/* Clear / chevron icons */}
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 gap-1">
                    {selectedCustomerId && (
                        <button
                            type="button"
                            onMouseDown={(e) => {
                                e.preventDefault();
                                handleClear();
                            }}
                            className="text-gray-400 hover:text-gray-700 p-1"
                            title="Clear"
                        >
                            ✕
                        </button>
                    )}
                    <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""
                            }`}
                    >
                        <path d="M6 9l6 6 6-6" strokeLinecap="round" />
                    </svg>
                </div>
            </div>

            {/* Dropdown */}
            {open && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-sm shadow-lg max-h-64 overflow-y-auto z-30">
                    {filtered.length === 0 ? (
                        <div className="px-3 py-4 text-center text-sm text-gray-400">
                            No customers match "{query}"
                        </div>
                    ) : (
                        filtered.map((c, index) => (
                            <div
                                key={c.id}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    handleSelect(c);
                                }}
                                onMouseEnter={() => setHighlightedIndex(index)}
                                className={`px-3 py-2.5 cursor-pointer border-b border-gray-100 last:border-0 text-sm flex justify-between items-center gap-2 ${index === highlightedIndex
                                        ? "bg-gray-100"
                                        : "hover:bg-gray-50"
                                    } ${c.id === selectedCustomerId
                                        ? "bg-blue-50"
                                        : ""
                                    }`}
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="font-medium truncate">
                                        {c.name}
                                    </p>
                                    <p className="text-[11px] font-mono text-gray-500">
                                        {c.phone}
                                    </p>
                                </div>

                                {showBalance &&
                                    c.creditBalance !== undefined &&
                                    c.creditBalance > 0 && (
                                        <span className="text-[11px] font-mono text-red-600 shrink-0">
                                            Due: Rs{" "}
                                            {c.creditBalance.toFixed(2)}
                                        </span>
                                    )}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}