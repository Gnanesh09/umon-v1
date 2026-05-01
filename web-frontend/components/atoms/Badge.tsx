import type { ReactNode } from "react";
import clsx from "clsx";

type Props = {
  status: "active" | "partially_released" | "released" | "disputed" | "cancelled";
};

const map = {
  active: "bg-blue-500/15 text-blue-300",
  partially_released: "bg-amber-500/15 text-amber-300",
  released: "bg-green-500/15 text-green-300",
  disputed: "bg-red-500/15 text-red-300",
  cancelled: "bg-zinc-500/15 text-zinc-300",
};

export function Badge({ status }: Props): ReactNode {
  return <span className={clsx("rounded-full px-2 py-1 text-xs capitalize", map[status])}>{status.replaceAll("_", " ")}</span>;
}