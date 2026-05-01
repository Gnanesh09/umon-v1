"use client";

import { type ReactNode, useState } from "react";

type Props = { content: string; children: ReactNode };

export function Tooltip({ content, children }: Props): ReactNode {
  const [visible, setVisible] = useState(false);

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible ? (
        <span className="absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[var(--surface-3)] px-2.5 py-1.5 text-xs text-[var(--text)] shadow-lg">
          {content}
          <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-[var(--surface-3)]" />
        </span>
      ) : null}
    </span>
  );
}
