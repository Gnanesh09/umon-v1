export function formatUsdc(lamports: number): string {
  const value = lamports / 1_000_000;
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " USDC";
}

export function formatUsdcRaw(lamports: number): string {
  const value = lamports / 1_000_000;
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function truncateAddress(address: string, start = 6, end = 4): string {
  if (address.length <= start + end + 3) return address;
  return `${address.slice(0, start)}...${address.slice(-end)}`;
}

export function truncateTxSignature(sig: string): string {
  if (sig.length <= 15) return sig;
  return `${sig.slice(0, 8)}...${sig.slice(-4)}`;
}

export function timeAgo(dateString: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateString).getTime()) / 1000,
  );
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function formatCountdown(targetDate: string | number | undefined | null): string {
  if (targetDate == null || targetDate === "") return "No date set";
  const target =
    typeof targetDate === "number"
      ? targetDate * 1000
      : new Date(targetDate).getTime();
  if (Number.isNaN(target)) return "Invalid date";
  const diff = target - Date.now();
  if (diff <= 0) return "Expired";
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1000);
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

export function conditionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    time_lock: "Time Lock",
    milestone: "Milestone",
    auto_split: "Auto Split",
    oracle: "Oracle Trigger",
    category: "Category Restrict",
    TimeLock: "Time Lock",
    MilestoneApproval: "Milestone",
    AutoSplit: "Auto Split",
    OracleTrigger: "Oracle Trigger",
    CategoryRestrict: "Category Restrict",
  };
  return labels[type] ?? type;
}
