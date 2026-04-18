"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

export function PageTransition({ children }: { children: ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setIsVisible(true);
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className={isVisible ? "page-enter-active" : "page-enter-start"}>
      {children}
    </div>
  );
}
