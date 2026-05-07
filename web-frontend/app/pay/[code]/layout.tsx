"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";

export default function PayLayout({ children }: { children: ReactNode }): ReactNode {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const origOverflow = body.style.overflow;
    const origBg = body.style.background;
    const origColor = body.style.color;

    html.style.overflow = "auto";
    body.style.overflow = "auto";
    body.style.background = "linear-gradient(135deg, #f9fafb, #f3f4f6)";
    body.style.color = "#111827";

    return () => {
      html.style.overflow = "";
      body.style.overflow = origOverflow;
      body.style.background = origBg;
      body.style.color = origColor;
    };
  }, []);

  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      style={
        {
          "--text": "#111827",
          "--text-muted": "#6b7280",
          "--border": "#e5e7eb",
          "--bg": "#f9fafb",
          "--surface": "#ffffff",
          color: "#111827",
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}
