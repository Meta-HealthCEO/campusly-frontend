import { create } from 'zustand';

interface CartItem {
  menuItemId: string;
  name: string;
  unitPrice: number; // cents
  quantity: number;
  totalPrice: number; // cents
}

type PaymentMethod = 'wallet' | 'wristband' | 'cash';

interface TuckShopStore {
  cartItems: CartItem[];
  selectedStudentId: string | null;
  paymentMethod: PaymentMethod;
  wristbandId: string;

  addToCart: (item: { id: string; name: string; price: number }) => void;
  removeFromCart: (menuItemId: string) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  clearCart: () => void;
  setStudent: (studentId: string | null) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setWristbandId: (id: string) => void;
  cartTotal: () => number;
  itemCount: () => number;
}

export const useTuckShopStore = create<TuckShopStore>((set, get) => ({
  cartItems: [],
  selectedStudentId: null,
  paymentMethod: 'wallet',
  wristbandId: '',

  addToCart: (item) => {
    set((state) => {
      const existing = state.cartItems.find((c) => c.menuItemId === item.id);
      if (existing) {
        return {
          cartItems: state.cartItems.map((c) =>
            c.menuItemId === item.id
              ? { ...c, quantity: c.quantity + 1, totalPrice: c.unitPrice * (c.quantity + 1) }
              : c,
          ),
        };
      }
      return {
        cartItems: [
          ...state.cartItems,
          {
            menuItemId: item.id,
            name: item.name,
            unitPrice: item.price,
            quantity: 1,
            totalPrice: item.price,
          },
        ],
      };
    });
  },

  removeFromCart: (menuItemId) => {
    set((state) => ({
      cartItems: state.cartItems.filter((c) => c.menuItemId !== menuItemId),
    }));
  },

  updateQuantity: (menuItemId, quantity) => {
    if (quantity <= 0) {
      get().removeFromCart(menuItemId);
      return;
    }
    set((state) => ({
      cartItems: state.cartItems.map((c) =>
        c.menuItemId === menuItemId
          ? { ...c, quantity, totalPrice: c.unitPrice * quantity }
          : c,
      ),
    }));
  },

  clearCart: () => {
    set({ cartItems: [], selectedStudentId: null, wristbandId: '' });
  },

  setStudent: (studentId) => set({ selectedStudentId: studentId }),
  setPaymentMethod: (method) => set({ paymentMethod: method }),
  setWristbandId: (id) => set({ wristbandId: id }),

  cartTotal: () => get().cartItems.reduce((sum, c) => sum + c.totalPrice, 0),
  itemCount: () => get().cartItems.reduce((sum, c) => sum + c.quantity, 0),
}));

export type { CartItem, PaymentMethod };
