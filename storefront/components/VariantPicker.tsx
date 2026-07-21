"use client";

import { useMemo, useState } from "react";
import { Variant } from "@/lib/api";

export function VariantPicker({ variants }: { variants: Variant[] }) {
  const sizes = useMemo(() => Array.from(new Set(variants.map((v) => v.size).filter(Boolean))) as string[], [variants]);
  const colors = useMemo(() => Array.from(new Set(variants.map((v) => v.color).filter(Boolean))) as string[], [variants]);

  const [size, setSize] = useState<string | null>(sizes[0] ?? null);
  const [color, setColor] = useState<string | null>(colors[0] ?? null);

  const selected =
    variants.find((v) => (sizes.length === 0 || v.size === size) && (colors.length === 0 || v.color === color)) ??
    variants[0];

  return (
    <div>
      {sizes.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-sm font-medium">Size</p>
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => (
              <button
                key={s}
                onClick={() => setSize(s)}
                className={`rounded-theme border px-3 py-1.5 text-sm transition-colors ${
                  s === size ? "border-primary bg-primary text-on-primary" : "border-border text-text hover:border-primary"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {colors.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-sm font-medium">Color</p>
          <div className="flex flex-wrap gap-2">
            {colors.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`rounded-theme border px-3 py-1.5 text-sm transition-colors ${
                  c === color ? "border-primary bg-primary text-on-primary" : "border-border text-text hover:border-primary"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {selected && (
        <div className="mt-4">
          <p className="font-heading text-2xl font-semibold text-text">${selected.price}</p>
          <p className="text-sm text-muted">
            {selected.inventory_count > 0 ? `${selected.inventory_count} in stock` : "Out of stock"}
          </p>
          <p className="mt-1 text-xs text-muted">SKU: {selected.sku}</p>
        </div>
      )}
    </div>
  );
}
