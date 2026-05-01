"use client";

import { ReactNode, useState } from "react";
import { Check, Copy } from "lucide-react";

type Props = { text: string; className?: string };

export function CopyButton({ text, className }: Props): ReactNode {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (): Promise<void> => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      className={`inline-flex items-center gap-1 text-[var(--text-muted)] transition hover:text-[var(--text)] ${className ?? ""}`}
      title="Copy to clipboard"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-[var(--success)]" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}
