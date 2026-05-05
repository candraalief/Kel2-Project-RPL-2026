"use client";

import { useCartStore } from "@/store/use-cart-store";

export function CartButton() {
  const { totalItems, openCart } = useCartStore();

  return (
    <button
      type="button"
      onClick={openCart}
      className="relative inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-800 shadow-sm transition hover:border-[#9ec3ff] hover:bg-[#f5f9ff]"
      aria-label={`Buka keranjang peminjaman, ${totalItems} buku`}
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
        <path
          d="M6.5 7h12l-1.2 7.2a2 2 0 0 1-2 1.7H9.2a2 2 0 0 1-2-1.7L6.1 5.8A2 2 0 0 0 4.1 4H3"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M9.5 20a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1Zm6 0a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
      <span className="hidden sm:inline">Keranjang</span>
      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#1d66d6] px-1.5 text-[11px] font-bold text-white">
        {totalItems}
      </span>
    </button>
  );
}
