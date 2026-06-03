"use client";

import Link from "next/link";
import { Badge, Card, Heading, Text } from "@/components/ui";
import type { Task } from "@/lib/types";
import { formatCents, statusColor, statusLabel } from "@/lib/format";

export function TaskCard({ task }: { task: Task }) {
  return (
    <Link href={`/tasks/${task.id}`} className="block">
      <Card size="2" variant="surface" className="h-full transition hover:border-gray-7">
        <div className="flex h-full flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <Badge color="gray" variant="soft" size="1">
              {task.topic_slug}
            </Badge>
            <Badge color={statusColor(task.status)} variant="soft" size="1">
              {statusLabel(task.status)}
            </Badge>
          </div>

          <Heading size="4" className="line-clamp-2">
            {task.title}
          </Heading>

          <Text size="2" color="gray" className="line-clamp-3 flex-1">
            {task.description}
          </Text>

          <div className="flex items-center justify-between border-t border-gray-4 pt-3">
            <div>
              <Text size="4" weight="bold" color="green">
                {formatCents(task.reward_per_slot_cents, task.currency)}
              </Text>
              <Text size="1" color="gray">
                {" "}
                per slot
              </Text>
            </div>
            <Text size="2" color="gray">
              {task.slots_remaining} of {task.slots_total} open
            </Text>
          </div>
        </div>
      </Card>
    </Link>
  );
}
