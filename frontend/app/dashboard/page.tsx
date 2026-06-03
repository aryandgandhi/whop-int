"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge, Button, Card, Heading, Separator, Text } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { SubmissionWithTask, Task, Wallet } from "@/lib/types";
import { formatCents, formatDate, statusColor, statusLabel } from "@/lib/format";

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [posted, setPosted] = useState<Task[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionWithTask[]>([]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    api.wallet().then(setWallet).catch(() => {});
    api.myPostedTasks().then(setPosted).catch(() => {});
    api.mySubmissions().then(setSubmissions).catch(() => {});
  }, [user]);

  if (loading || !user) return <Text color="gray">Loading...</Text>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Heading size="7">Hi, {user.display_name}</Heading>
        <Link href={`/u/${user.id}`}>
          <Button size="2" variant="soft" color="gray">
            View public profile
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card size="3" variant="surface">
          <Text size="2" color="gray">
            Available
          </Text>
          <Heading size="7" color="green">
            {wallet ? formatCents(wallet.available_cents) : "--"}
          </Heading>
        </Card>
        <Card size="3" variant="surface">
          <Text size="2" color="gray">
            In escrow
          </Text>
          <Heading size="7" color="amber">
            {wallet ? formatCents(wallet.escrow_cents) : "--"}
          </Heading>
        </Card>
        <Card size="3" variant="surface">
          <Text size="2" color="gray">
            Tasks posted
          </Text>
          <Heading size="7">{posted.length}</Heading>
        </Card>
      </div>

      <Card size="4" variant="surface">
        <Heading size="5" className="mb-3">
          Tasks you posted
        </Heading>
        {posted.length === 0 ? (
          <Text color="gray">
            You have not posted any tasks.{" "}
            <Link href="/tasks/new" className="text-orange-11 underline">
              Post one
            </Link>
            .
          </Text>
        ) : (
          <div className="flex flex-col gap-2">
            {posted.map((task) => (
              <Link key={task.id} href={`/tasks/${task.id}`}>
                <div className="flex items-center justify-between rounded-3 border border-gray-4 px-4 py-3 hover:border-gray-7">
                  <div className="flex flex-col">
                    <Text size="2" weight="medium">
                      {task.title}
                    </Text>
                    <Text size="1" color="gray">
                      {task.slots_filled}/{task.slots_total} filled &middot;{" "}
                      {formatCents(task.reward_per_slot_cents, task.currency)} per slot
                    </Text>
                  </div>
                  <Badge color={statusColor(task.status)} variant="soft" size="1">
                    {statusLabel(task.status)}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <Card size="4" variant="surface">
        <Heading size="5" className="mb-3">
          Your submissions
        </Heading>
        {submissions.length === 0 ? (
          <Text color="gray">You have not submitted to any tasks yet.</Text>
        ) : (
          <div className="flex flex-col gap-2">
            {submissions.map((sub) => (
              <Link key={sub.id} href={`/tasks/${sub.task.id}`}>
                <div className="flex items-center justify-between rounded-3 border border-gray-4 px-4 py-3 hover:border-gray-7">
                  <div className="flex flex-col">
                    <Text size="2" weight="medium">
                      {sub.task.title}
                    </Text>
                    <Text size="1" color="gray">
                      {formatCents(sub.task.reward_per_slot_cents, sub.task.currency)} reward
                    </Text>
                  </div>
                  <Badge color={statusColor(sub.status)} variant="soft" size="1">
                    {statusLabel(sub.status)}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>

      {wallet && wallet.transactions.length > 0 && (
        <Card size="4" variant="surface">
          <Heading size="5" className="mb-3">
            Wallet activity
          </Heading>
          <div className="flex flex-col">
            {wallet.transactions.map((tx, idx) => (
              <div key={tx.id}>
                {idx > 0 && <Separator size="4" />}
                <div className="flex items-center justify-between py-2">
                  <div className="flex flex-col">
                    <Text size="2" weight="medium">
                      {statusLabel(tx.type)}
                    </Text>
                    <Text size="1" color="gray">
                      {tx.description ?? ""} &middot; {formatDate(tx.created_at)}
                    </Text>
                  </div>
                  <Text
                    size="2"
                    weight="bold"
                    color={tx.type === "escrow_hold" ? "amber" : "green"}
                  >
                    {formatCents(tx.amount_cents)}
                  </Text>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
