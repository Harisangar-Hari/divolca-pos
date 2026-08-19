// customerApi.ts
import { api } from "../services/api";

export interface Customer {
    id: string;
    name: string;
    phone: string;
    email?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    companyName?: string;
    customerType?: string;
    creditLimit: number;
    creditBalance: number;
    availableCredit: number; // ✅ Add this field
    isActive: boolean;
    isBlocked: boolean;
    loyaltyPoints: number;
    loyaltyTier: string;
    totalSpent: number;
    createdAt: string;
    updatedAt?: string;
}

export const getCustomers = async (): Promise<Customer[]> => {
    const res = await api.get("/customers");

    return res.data.map((c: any) => ({
        id: c.Id,
        name: c.Name,
        phone: c.Phone,
        email: c.Email || "",
        address: c.Address || "",
        city: c.City || "",
        state: c.State || "",
        country: c.Country || "",
        companyName: c.CompanyName || "",
        customerType: c.CustomerType || "RETAIL",
        creditLimit: Number(c.CreditLimit || 0),
        creditBalance: Number(c.CreditBalance || 0),
        availableCredit: Number(c.AvailableCredit || 0), // ✅ Map this field
        isActive: c.IsActive !== undefined ? c.IsActive : true,
        isBlocked: c.IsBlocked || false,
        loyaltyPoints: c.LoyaltyPoints || 0,
        loyaltyTier: c.LoyaltyTier || "Bronze",
        totalSpent: Number(c.TotalSpent || 0),
        createdAt: c.CreatedAt,
        updatedAt: c.UpdatedAt || "",
    }));
};

export const createCustomer = async (data: {
    Name: string;
    Phone: string;
    Email?: string;
    Address?: string;
    City?: string;
    State?: string;
    PostalCode?: string;
    Country?: string;
    CompanyName?: string;
    CustomerType?: string;
    CreditLimit?: number;
    PaymentTerms?: string;
    TaxNumber?: string;
    Notes?: string;
}) => {
    const res = await api.post("/customers", data);
    return res.data;
};

export const getCustomerById = async (id: string): Promise<Customer> => {
    const res = await api.get(`/customers/${id}`);
    const c = res.data;

    return {
        id: c.Id,
        name: c.Name,
        phone: c.Phone,
        email: c.Email || "",
        address: c.Address || "",
        city: c.City || "",
        state: c.State || "",
        country: c.Country || "",
        companyName: c.CompanyName || "",
        customerType: c.CustomerType || "RETAIL",
        creditLimit: Number(c.CreditLimit || 0),
        creditBalance: Number(c.CreditBalance || 0),
        availableCredit: Number(c.AvailableCredit || 0),
        isActive: c.IsActive !== undefined ? c.IsActive : true,
        isBlocked: c.IsBlocked || false,
        loyaltyPoints: c.LoyaltyPoints || 0,
        loyaltyTier: c.LoyaltyTier || "Bronze",
        totalSpent: Number(c.TotalSpent || 0),
        createdAt: c.CreatedAt,
        updatedAt: c.UpdatedAt || "",
    };
};