"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function ButtonLoadingSpinner({
  className = "h-4 w-4",
}: {
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
    />
  );
}

export function useButtonPressLoading<T>(duration = 800) {
  const [loadingKey, setLoadingKey] = useState<T | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const clearLoading = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setLoadingKey(null);
  }, []);

  const startLoading = useCallback(
    (key: T) => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }

      setLoadingKey(key);
      timeoutRef.current = window.setTimeout(() => {
        setLoadingKey(null);
        timeoutRef.current = null;
      }, duration);
    },
    [duration]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { loadingKey, startLoading, clearLoading };
}
