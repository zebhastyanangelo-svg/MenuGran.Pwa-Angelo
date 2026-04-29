import { create } from 'zustand';

export type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  restaurantId: string;
  image?: string;
};

type CartState = {
  items: CartItem[];
  total: number;
  itemCount: number;
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
};

const calculateTotal = (items: CartItem[]) =>
  items.reduce((sum, item) => sum + item.price * item.quantity, 0);

const calculateItemCount = (items: CartItem[]) =>
  items.reduce((count, item) => count + item.quantity, 0);

export const useCartStore = create<CartState>((set) => ({
  items: [],
  total: 0,
  itemCount: 0,
  addItem: (item) =>
    set((state) => {
      const existing = state.items.find((entry) => entry.id === item.id);
      const items = existing
        ? state.items.map((entry) =>
            entry.id === item.id
              ? { ...entry, quantity: entry.quantity + item.quantity }
              : entry
          )
        : [...state.items, item];

      return {
        items,
        total: calculateTotal(items),
        itemCount: calculateItemCount(items),
      };
    }),
  removeItem: (id) =>
    set((state) => {
      const items = state.items.filter((item) => item.id !== id);
      return {
        items,
        total: calculateTotal(items),
        itemCount: calculateItemCount(items),
      };
    }),
  updateQuantity: (id, quantity) =>
    set((state) => {
      const items = state.items
        .map((item) =>
          item.id === id ? { ...item, quantity } : item
        )
        .filter((item) => item.quantity > 0);

      return {
        items,
        total: calculateTotal(items),
        itemCount: calculateItemCount(items),
      };
    }),
  clearCart: () => set({ items: [], total: 0, itemCount: 0 }),
}));
