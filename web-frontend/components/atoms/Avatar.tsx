import type { ReactNode } from "react";
type Props = { address: string; size?: number };

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hash;
}

function hslFromHash(hash: number, index: number): string {
  const h = ((hash >> (index * 8)) & 0xff) * 1.41;
  return `hsl(${h % 360}, 65%, 55%)`;
}

export function Avatar({ address, size = 32 }: Props): ReactNode {
  const hash = hashCode(address);
  const bg = hslFromHash(hash, 0);
  const fg = hslFromHash(hash, 2);

  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className="rounded-full">
      <rect width="32" height="32" fill={bg} rx="16" />
      <circle cx="16" cy="12" r="5" fill={fg} />
      <circle cx="16" cy="28" r="10" fill={fg} opacity="0.7" />
    </svg>
  );
}
