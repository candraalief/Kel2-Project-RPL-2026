"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";

export type BorrowCartItem = {
  bookId: number;
  title: string;
  coverUrl: string | null;
  availableCount: number;
  quantity: number;
};

type AddCartItemInput = Omit<BorrowCartItem, "quantity"> & {
  quantity?: number;
};

type CartState = {
  items: BorrowCartItem[];
  isOpen: boolean;
  hydrated: boolean;
};

type CartAction =
  | { type: "hydrate"; items: BorrowCartItem[] }
  | { type: "add"; item: AddCartItemInput }
  | { type: "increase"; bookId: number }
  | { type: "decrease"; bookId: number }
  | { type: "setQuantity"; bookId: number; quantity: number }
  | { type: "remove"; bookId: number }
  | { type: "clear" }
  | { type: "open" }
  | { type: "close" };

type CartContextValue = CartState & {
  totalItems: number;
  addItem: (item: AddCartItemInput) => void;
  increaseItem: (bookId: number) => void;
  decreaseItem: (bookId: number) => void;
  setItemQuantity: (bookId: number, quantity: number) => void;
  removeItem: (bookId: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
};

const storageKey = "perpustakaan.borrowCart.v1";
const CartContext = createContext<CartContextValue | null>(null);

const initialState: CartState = {
  items: [],
  isOpen: false,
  hydrated: false,
};

function clampQuantity(quantity: number, availableCount: number) {
  if (!Number.isFinite(quantity)) {
    return 1;
  }

  return Math.max(1, Math.min(Math.floor(quantity), Math.max(availableCount, 1)));
}

function sanitizeItems(items: BorrowCartItem[]) {
  return items
    .filter(
      (item) =>
        Number.isInteger(item.bookId) &&
        item.bookId > 0 &&
        typeof item.title === "string" &&
        Number.isInteger(item.availableCount) &&
        item.availableCount > 0
    )
    .map((item) => ({
      ...item,
      quantity: clampQuantity(item.quantity, item.availableCount),
    }));
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "hydrate":
      return {
        ...state,
        hydrated: true,
        items: sanitizeItems(action.items),
      };
    case "add": {
      const quantity = clampQuantity(
        action.item.quantity ?? 1,
        action.item.availableCount
      );
      const existing = state.items.find(
        (item) => item.bookId === action.item.bookId
      );

      if (existing) {
        return {
          ...state,
          items: state.items.map((item) =>
            item.bookId === action.item.bookId
              ? {
                  ...item,
                  title: action.item.title,
                  coverUrl: action.item.coverUrl,
                  availableCount: action.item.availableCount,
                  quantity: clampQuantity(
                    item.quantity + quantity,
                    action.item.availableCount
                  ),
                }
              : item
          ),
        };
      }

      return {
        ...state,
        items: [
          ...state.items,
          {
            bookId: action.item.bookId,
            title: action.item.title,
            coverUrl: action.item.coverUrl,
            availableCount: action.item.availableCount,
            quantity,
          },
        ],
      };
    }
    case "increase":
      return {
        ...state,
        items: state.items.map((item) =>
          item.bookId === action.bookId
            ? {
                ...item,
                quantity: clampQuantity(item.quantity + 1, item.availableCount),
              }
            : item
        ),
      };
    case "decrease":
      return {
        ...state,
        items: state.items.map((item) =>
          item.bookId === action.bookId
            ? {
                ...item,
                quantity: clampQuantity(item.quantity - 1, item.availableCount),
              }
            : item
        ),
      };
    case "setQuantity":
      return {
        ...state,
        items: state.items.map((item) =>
          item.bookId === action.bookId
            ? {
                ...item,
                quantity: clampQuantity(action.quantity, item.availableCount),
              }
            : item
        ),
      };
    case "remove":
      return {
        ...state,
        items: state.items.filter((item) => item.bookId !== action.bookId),
      };
    case "clear":
      return {
        ...state,
        items: [],
      };
    case "open":
      return {
        ...state,
        isOpen: true,
      };
    case "close":
      return {
        ...state,
        isOpen: false,
      };
    default:
      return state;
  }
}

function readPersistedItems() {
  try {
    const raw = window.localStorage.getItem(storageKey);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed) ? sanitizeItems(parsed) : [];
  } catch {
    return [];
  }
}

export function BorrowCartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  useEffect(() => {
    dispatch({ type: "hydrate", items: readPersistedItems() });
  }, []);

  useEffect(() => {
    if (!state.hydrated) {
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(state.items));
  }, [state.hydrated, state.items]);

  const addItem = useCallback((item: AddCartItemInput) => {
    dispatch({ type: "add", item });
  }, []);

  const increaseItem = useCallback((bookId: number) => {
    dispatch({ type: "increase", bookId });
  }, []);

  const decreaseItem = useCallback((bookId: number) => {
    dispatch({ type: "decrease", bookId });
  }, []);

  const setItemQuantity = useCallback((bookId: number, quantity: number) => {
    dispatch({ type: "setQuantity", bookId, quantity });
  }, []);

  const removeItem = useCallback((bookId: number) => {
    dispatch({ type: "remove", bookId });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: "clear" });
  }, []);

  const openCart = useCallback(() => {
    dispatch({ type: "open" });
  }, []);

  const closeCart = useCallback(() => {
    dispatch({ type: "close" });
  }, []);

  const value = useMemo<CartContextValue>(() => {
    const totalItems = state.items.reduce(
      (total, item) => total + item.quantity,
      0
    );

    return {
      ...state,
      totalItems,
      addItem,
      increaseItem,
      decreaseItem,
      setItemQuantity,
      removeItem,
      clearCart,
      openCart,
      closeCart,
    };
  }, [
    addItem,
    clearCart,
    closeCart,
    decreaseItem,
    increaseItem,
    openCart,
    removeItem,
    setItemQuantity,
    state,
  ]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCartStore() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCartStore must be used within BorrowCartProvider.");
  }

  return context;
}
