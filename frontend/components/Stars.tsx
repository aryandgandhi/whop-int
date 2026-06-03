"use client";

import { Text } from "@/components/ui";

export function Stars({ rating, count }: { rating: number | null; count?: number }) {
  if (rating === null) {
    return (
      <Text size="2" color="gray">
        No ratings yet
      </Text>
    );
  }
  const rounded = Math.round(rating);
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-amber-9" aria-hidden>
        {"★".repeat(rounded)}
        <span className="text-gray-6">{"★".repeat(5 - rounded)}</span>
      </span>
      <Text size="2" color="gray">
        {rating.toFixed(1)}
        {count !== undefined ? ` (${count})` : ""}
      </Text>
    </span>
  );
}
