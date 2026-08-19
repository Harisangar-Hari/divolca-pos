// components/CustomerOutstandingDisplay.tsx
interface Customer {
    id: string;
    name: string;
    phone: string;
    creditBalance?: number;
}

interface CustomerOutstandingDisplayProps {
    customer: Customer | null | undefined;
    className?: string;
}

export default function CustomerOutstandingDisplay({
    customer,
    className = "",
}: CustomerOutstandingDisplayProps) {
    if (!customer) return null;

    const creditBalance = customer.creditBalance || 0;
    const hasOutstanding = creditBalance > 0;

    return (
        <div className={`bg-gray-50 border border-gray-200 p-3 rounded-sm ${className}`}>
            <div className="flex justify-between items-center">
                <span className="text-xs font-bold tracking-wider text-gray-600 uppercase">
                    Outstanding Balance
                </span>
                <span
                    className={`font-mono font-bold text-lg ${hasOutstanding ? "text-red-600" : "text-green-600"
                        }`}
                >
                    Rs {creditBalance.toFixed(2)}
                </span>
            </div>
            {hasOutstanding ? (
                <p className="text-[10px] text-red-500 mt-1">
                    ⚠️ Customer has outstanding balance of Rs {creditBalance.toFixed(2)}
                </p>
            ) : (
                <p className="text-[10px] text-green-500 mt-1">✅ No outstanding balance</p>
            )}
        </div>
    );
}