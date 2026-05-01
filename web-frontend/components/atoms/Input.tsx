import clsx from "clsx";
import { type ReactNode, forwardRef, type InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  helper?: string;
};

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { label, error, helper, className, ...rest },
  ref,
): ReactNode {
  return (
    <label className="grid gap-1.5 text-sm text-[var(--text-muted)]">
      {label ? <span>{label}</span> : null}
      <input
        ref={ref}
        className={clsx(
          "h-10 rounded-md border bg-[var(--surface)] px-3 text-[var(--text)] outline-none transition focus:border-[var(--primary)]",
          error ? "border-[var(--error)]" : "border-[var(--border)]",
          className,
        )}
        {...rest}
      />
      {error ? <span className="text-xs text-[var(--error)]">{error}</span> : helper ? <span className="text-xs">{helper}</span> : null}
    </label>
  );
});
