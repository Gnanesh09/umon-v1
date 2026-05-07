"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";

export default function PayLayout({ children }: { children: ReactNode }): ReactNode {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const origHtmlOverflow = html.style.overflow;
    const origOverflow = body.style.overflow;
    const origBg = body.style.background;
    const origColor = body.style.color;

    html.style.overflow = "auto";
    body.style.overflow = "auto";
    body.style.background = "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)";
    body.style.color = "#0f172a";

    html.classList.add("pay-light");

    return () => {
      html.style.overflow = origHtmlOverflow;
      body.style.overflow = origOverflow;
      body.style.background = origBg;
      body.style.color = origColor;
      html.classList.remove("pay-light");
    };
  }, []);

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-8"
      style={
        {
          "--text": "#0f172a",
          "--text-muted": "#64748b",
          "--border": "#e2e8f0",
          "--bg": "#f8fafc",
          "--surface": "#ffffff",
          color: "#0f172a",
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}
