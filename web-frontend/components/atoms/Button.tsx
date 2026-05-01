"use client";

import clsx from "clsx";
import type { ReactNode, ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
};

export function Button({ variant = "primary", size = "md", loading = false, className, children, ...rest }: Props): ReactNode {
  const variantClass: Record<Variant, string> = {
    primary: "bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white",
    secondary: "bg-[var(--surface-3)] hover:bg-[var(--surface-2)] text-[var(--text)]",
    ghost: "bg-transparent hover:bg-[var(--surface-2)] text-[var(--text)]",
    danger: "bg-[var(--error)] hover:opacity-90 text-white",
  };

  const sizeClass: Record<Size, string> = {
    sm: "h-8 px-3 text-sm",
    md: "h-10 px-4 text-sm",
    lg: "h-12 px-5 text-base",
  };

  return (
    <button
      className={clsx("inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] disabled:opacity-60", variantClass[variant], sizeClass[size], className)}
      {...rest}
      disabled={loading || rest.disabled}
    >
      {loading ? "Loading..." : children}
    </button>
  );
}