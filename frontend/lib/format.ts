export function formatCents(cents: number, currency = "usd"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export type StatusColor = "green" | "blue" | "gray" | "red" | "amber" | "indigo" | "cyan";

const STATUS_COLORS: Record<string, StatusColor> = {
  // Task statuses
  open: "green",
  in_progress: "blue",
  completed: "gray",
  cancelled: "red",
  // Engagement statuses
  volunteered: "indigo",
  accepted: "cyan",
  submitted: "amber",
  rejected: "red",
  withdrawn: "gray",
};

export function statusColor(status: string): StatusColor {
  return STATUS_COLORS[status] ?? "gray";
}

export function statusLabel(status: string): string {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
