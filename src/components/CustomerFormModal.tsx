// components/CustomerFormModal.tsx
import { useState } from "react";

interface CustomerFormData {
    name: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    companyName: string;
    taxNumber: string;
    customerType: string;
    creditLimit: number;
    paymentTerms: string;
    notes: string;
}

interface CustomerFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: CustomerFormData) => Promise<void>;
    isLoading?: boolean;
}

const initialFormData: CustomerFormData = {
    name: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    postalCode: "",
    country: "Srilnaka",
    companyName: "",
    taxNumber: "",
    customerType: "RETAIL",
    creditLimit: 0,
    paymentTerms: "Due on receipt",
    notes: "",
};

export default function CustomerFormModal({
    isOpen,
    onClose,
    onSave,
    isLoading = false,
}: CustomerFormModalProps) {
    const [formData, setFormData] = useState<CustomerFormData>(initialFormData);

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value, type } = e.target;

        if (name === "creditLimit") {
            const numValue = parseFloat(value);
            setFormData((prev) => ({
                ...prev,
                [name]: isNaN(numValue) ? 0 : numValue,
            }));
        } else {
            setFormData((prev) => ({
                ...prev,
                [name]: type === "number" ? parseFloat(value) || 0 : value,
            }));
        }
    };

    const handleSubmit = async () => {
        if (!formData.name.trim()) {
            alert("Customer name is required");
            return;
        }
        if (!formData.phone.trim()) {
            alert("Phone number is required");
            return;
        }

        await onSave(formData);
        setFormData(initialFormData);
    };

    const handleClose = () => {
        setFormData(initialFormData);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white border border-gray-300 rounded-sm w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
                <div className="px-5 py-4 border-b border-gray-300 bg-gray-50 sticky top-0 z-10">
                    <h2 className="text-sm font-bold tracking-wider text-gray-800 uppercase">
                        Create Customer
                    </h2>
                </div>

                <div className="p-5 space-y-4">
                    {/* Personal Information */}
                    <div className="border-b border-gray-200 pb-3">
                        <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-3">
                            Personal Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-gray-700 block mb-1">
                                    Full Name *
                                </label>
                                <input
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-sm text-sm outline-none focus:border-gray-800 focus:ring-1 focus:ring-gray-800 transition-colors"
                                    placeholder="Enter name"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-700 block mb-1">
                                    Phone Number *
                                </label>
                                <input
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-sm text-sm outline-none focus:border-gray-800 focus:ring-1 focus:ring-gray-800 transition-colors"
                                    placeholder="Enter phone"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-700 block mb-1">
                                    Email
                                </label>
                                <input
                                    name="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-sm text-sm outline-none focus:border-gray-800 focus:ring-1 focus:ring-gray-800 transition-colors"
                                    placeholder="Enter email"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-700 block mb-1">
                                    Company Name
                                </label>
                                <input
                                    name="companyName"
                                    value={formData.companyName}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-sm text-sm outline-none focus:border-gray-800 focus:ring-1 focus:ring-gray-800 transition-colors"
                                    placeholder="Enter company name"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Address Information */}
                    <div className="border-b border-gray-200 pb-3">
                        <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-3">
                            Address Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="md:col-span-2">
                                <label className="text-xs font-medium text-gray-700 block mb-1">
                                    Address
                                </label>
                                <input
                                    name="address"
                                    value={formData.address}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-sm text-sm outline-none focus:border-gray-800 focus:ring-1 focus:ring-gray-800 transition-colors"
                                    placeholder="Enter address"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-700 block mb-1">
                                    City
                                </label>
                                <input
                                    name="city"
                                    value={formData.city}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-sm text-sm outline-none focus:border-gray-800 focus:ring-1 focus:ring-gray-800 transition-colors"
                                    placeholder="Enter city"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-700 block mb-1">
                                    State
                                </label>
                                <input
                                    name="state"
                                    value={formData.state}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-sm text-sm outline-none focus:border-gray-800 focus:ring-1 focus:ring-gray-800 transition-colors"
                                    placeholder="Enter state"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-700 block mb-1">
                                    Postal Code
                                </label>
                                <input
                                    name="postalCode"
                                    value={formData.postalCode}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-sm text-sm outline-none focus:border-gray-800 focus:ring-1 focus:ring-gray-800 transition-colors"
                                    placeholder="Enter postal code"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-700 block mb-1">
                                    Country
                                </label>
                                <input
                                    name="country"
                                    value={formData.country}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-sm text-sm outline-none focus:border-gray-800 focus:ring-1 focus:ring-gray-800 transition-colors"
                                    placeholder="Enter country"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Business Information */}
                    <div>
                        <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-3">
                            Business Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-gray-700 block mb-1">
                                    Customer Type
                                </label>
                                <select
                                    name="customerType"
                                    value={formData.customerType}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-sm text-sm outline-none focus:border-gray-800 focus:ring-1 focus:ring-gray-800 transition-colors"
                                >
                                    <option value="RETAIL">Retail</option>
                                    <option value="WHOLESALE">Wholesale</option>
                                    <option value="CORPORATE">Corporate</option>
                                    <option value="VIP">VIP</option>
                                    <option value="GOVERNMENT">Government</option>
                                    <option value="EDUCATIONAL">Educational</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-700 block mb-1">
                                    Tax Number
                                </label>
                                <input
                                    name="taxNumber"
                                    value={formData.taxNumber}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-sm text-sm outline-none focus:border-gray-800 focus:ring-1 focus:ring-gray-800 transition-colors"
                                    placeholder="Enter tax number"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-700 block mb-1">
                                    Credit Limit
                                </label>
                                <input
                                    name="creditLimit"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formData.creditLimit || ""}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-sm text-sm outline-none focus:border-gray-800 focus:ring-1 focus:ring-gray-800 transition-colors"
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-700 block mb-1">
                                    Payment Terms
                                </label>
                                <input
                                    name="paymentTerms"
                                    value={formData.paymentTerms}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-sm text-sm outline-none focus:border-gray-800 focus:ring-1 focus:ring-gray-800 transition-colors"
                                    placeholder="Due on receipt"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-xs font-medium text-gray-700 block mb-1">
                                    Notes
                                </label>
                                <textarea
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleInputChange}
                                    rows={2}
                                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-sm text-sm outline-none focus:border-gray-800 focus:ring-1 focus:ring-gray-800 transition-colors resize-none"
                                    placeholder="Additional notes..."
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-5 py-4 border-t border-gray-300 bg-gray-50 flex gap-3 sticky bottom-0">
                    <button
                        onClick={handleClose}
                        disabled={isLoading}
                        className="flex-1 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 py-2.5 rounded-sm transition-colors text-xs font-bold uppercase tracking-wider disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="flex-1 bg-gray-900 hover:bg-black text-white py-2.5 rounded-sm transition-colors text-xs font-bold uppercase tracking-wider disabled:opacity-50"
                    >
                        {isLoading ? "Saving..." : "Save Customer"}
                    </button>
                </div>
            </div>
        </div>
    );
}