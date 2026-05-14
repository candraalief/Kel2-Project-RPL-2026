"use client";

import { useState } from "react";

type PasswordInputProps = {
  id: string;
  label: string;
  name?: string;
  value?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  minLength?: number;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  labelClassName?: string;
};

const defaultInputClassName =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 pr-12 text-zinc-950 outline-none transition focus:border-[#145da0]";

export function PasswordInput({
  id,
  label,
  name = id,
  value,
  onChange,
  required = false,
  minLength,
  placeholder,
  className = "space-y-2",
  inputClassName = defaultInputClassName,
  labelClassName = "text-sm font-medium text-zinc-800",
}: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className={className}>
      <label htmlFor={id} className={labelClassName}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={isVisible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          required={required}
          minLength={minLength}
          placeholder={placeholder}
          className={inputClassName}
        />
        <button
          type="button"
          onClick={() => setIsVisible((current) => !current)}
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-zinc-500 transition hover:text-[#145da0] focus:outline-none focus-visible:text-[#145da0]"
          aria-label={isVisible ? `Sembunyikan ${label}` : `Lihat ${label}`}
          title={isVisible ? `Sembunyikan ${label}` : `Lihat ${label}`}
        >
          <PasswordVisibilityIcon isVisible={isVisible} />
        </button>
      </div>
    </div>
  );
}

function PasswordVisibilityIcon({
  isVisible,
  className = "h-5 w-5",
}: {
  isVisible: boolean;
  className?: string;
}) {
  if (isVisible) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path
          d="M3 3l18 18"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M10.6 10.6a2 2 0 002.8 2.8"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M8.5 5.5A9.6 9.6 0 0112 5c6 0 9.5 7 9.5 7a16.5 16.5 0 01-3 3.9"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M15.4 18.3A9.9 9.9 0 0112 19c-6 0-9.5-7-9.5-7a16.7 16.7 0 014.1-4.8"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
