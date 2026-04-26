"use client";

import type { ReactNode } from "react";
import { useState } from "react";

export function CollapsibleSectionCard({
  title,
  subtitle,
  children,
  defaultOpen = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <article className="overflow-hidden rounded-[1.5rem] border border-zinc-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-4 p-5 text-left transition hover:bg-zinc-50"
      >
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            {title}
          </p>
          {subtitle ? (
            <h2 className="mt-2 text-2xl font-semibold text-zinc-900">
              {subtitle}
            </h2>
          ) : null}
        </div>
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-500 transition ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
            <path
              d="M6 9l6 6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      {isOpen ? <div className="border-t border-zinc-100 p-5">{children}</div> : null}
    </article>
  );
}
