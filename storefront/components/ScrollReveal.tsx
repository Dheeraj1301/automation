"use client";

import { ReactNode, useEffect, useRef, useState } from "react";

/**
 * Wraps content that should fade/slide in once it scrolls into view,
 * rather than animating everything on page load (which looks fine for
 * above-the-fold content but is jarring for anything further down).
 */
export function ScrollReveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`${isVisible ? "animate-reveal" : "opacity-0"} ${className}`}>
      {children}
    </div>
  );
}
