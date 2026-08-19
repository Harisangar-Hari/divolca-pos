// components/CustomerSelect.tsx
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
    return (
        <div>
            <div className="flex justify-between items-end mb-1.5">
                <label className="text-xs font-bold tracking-wider text-gray-600 uppercase block">
                    {label}
                </label>
                <button
                    onClick={onAddNew}
                    className="text-gray-600 text-xs font-bold uppercase tracking-wider hover:text-gray-900 flex items-center gap-1"
                >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12h14" />
                    </svg>
                    New
                </button>
            </div>
            <select
                value={selectedCustomerId}
                onChange={(e) => onSelect(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-sm text-sm outline-none focus:border-gray-800 focus:ring-1 focus:ring-gray-800 transition-colors cursor-pointer"
            >
                <option value="">{placeholder}</option>
                {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                        {c.name} ({c.phone})
                        {showBalance && c.creditBalance !== undefined && c.creditBalance > 0 &&
                            ` - Due: Rs ${c.creditBalance.toFixed(2)}`
                        }
                    </option>
                ))}
            </select>
        </div>
    );
}