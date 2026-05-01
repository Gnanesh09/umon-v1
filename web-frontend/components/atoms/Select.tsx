"use client";

import clsx from "clsx";
import { type ReactNode, forwardRef, type SelectHTMLAttributes } from "react";

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
};

export const Select = forwardRef<HTMLSelectElement, Props>(function Select(
  { label, error, options, placeholder, className, ...rest },
  ref,
): ReactNode {
  return (
    <label className="grid gap-1.5 text-sm text-[var(--text-muted)]">
      {label ? <span>{label}</span> : null}
      <select
        ref={ref}
        className={clsx(
          "h-10 rounded-md border bg-[var(--surface)] px-3 text-[var(--text)] outline-none transition focus:border-[var(--primary)]",
          error ? "border-[var(--error)]" : "border-[var(--border)]",
          className,
        )}
        {...rest}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error ? <span className="text-xs text-[var(--error)]">{error}</span> : null}
    </label>
  );
});
