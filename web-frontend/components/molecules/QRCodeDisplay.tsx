"use client";

import { type ReactNode } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Download, Copy, Check } from "lucide-react";
import { useState } from "react";

type QRCodeDisplayProps = {
  url: string;
  size?: number;
  title?: string;
};

export function QRCodeDisplay({ url, size = 200, title }: QRCodeDisplayProps): ReactNode {
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {title && <p className="text-sm font-medium text-gray-700">{title}</p>}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <QRCodeSVG value={url} size={size} level="M" />
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={copyLink}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
        >
          {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
          {copied ? "Copied!" : "Copy Link"}
        </button>
      </div>
      <p className="max-w-[250px] truncate text-xs text-gray-400">{url}</p>
    </div>
  );
}
