import { create } from "zustand";

interface CartItem {
  id: string;
  name: string;
  barcode: string;
  price: number;       // Selling Price
  costPrice: number;   // Added Cost Price for validation
  quantity: number;

  // New fields for updated cart
  discountPercent?: number;
  discountRs?: number;
  additionalPrice?: number;
  deductPrice?: number;
  stockQty?: number;  // Optional field for stock quantity
}

interface CartState {
  items: CartItem[];

  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  increaseQty: (id: string) => void;
  decreaseQty: (id: string) => void;
  clearCart: () => void;
  updateItem: (id: string, updates: Partial<CartItem>) => void;
  getTotal: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],

  addItem: (item) => {
    const existing = get().items.find((i) => i.id === item.id);

    if (existing) {
      set({
        items: get().items.map((i) =>
          i.id === item.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        ),
      });
    } else {
      set({
        items: [...get().items, {
          ...item,
          quantity: 1,
          discountPercent: 0,
          discountRs: 0,
          additionalPrice: 0,
          deductPrice: 0,
        }]
      });
    }
  },

  removeItem: (id) =>
    set({ items: get().items.filter((i) => i.id !== id) }),

  increaseQty: (id) =>
    set({
      items: get().items.map((i) =>
        i.id === id ? { ...i, quantity: i.quantity + 1 } : i
      ),
    }),

  decreaseQty: (id) =>
    set({
      items: get().items
        .map((i) =>
          i.id === id
            ? { ...i, quantity: i.quantity - 1 }
            : i
        )
        .filter((i) => i.quantity > 0),
    }),

  clearCart: () => set({ items: [] }),

  updateItem: (id, updates) =>
    set({
      items: get().items.map((i) =>
        i.id === id ? { ...i, ...updates } : i
      ),
    }),

  getTotal: () =>
    get().items.reduce((sum, i) => {
      // Per unit pricing logic
      let unitPrice = i.price;

      // Apply % discount
      const percentDiscount = (i.discountPercent || 0) / 100;
      const priceAfterPercent = unitPrice - (unitPrice * percentDiscount);

      // Apply Rs discount
      const priceAfterRs = Math.max(0, priceAfterPercent - (i.discountRs || 0));

      // Calculate full line total
      const baseTotal = priceAfterRs * i.quantity;
      const addTotal = (i.additionalPrice || 0) * i.quantity;
      const deductTotal = (i.deductPrice || 0) * i.quantity;

      return sum + baseTotal + addTotal - deductTotal;
    }, 0),
}));