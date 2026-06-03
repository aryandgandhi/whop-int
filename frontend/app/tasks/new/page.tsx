"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Button,
  Callout,
  Card,
  Heading,
  Select,
  Text,
  TextArea,
  TextInput,
} from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Topic } from "@/lib/types";
import { formatCents } from "@/lib/format";

export default function NewTaskPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [topicSlug, setTopicSlug] = useState<string>("");
  const [rewardDollars, setRewardDollars] = useState("");
  const [slots, setSlots] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    api
      .topics()
      .then((t) => {
        setTopics(t);
        if (t.length > 0) setTopicSlug((prev) => prev || t[0].slug);
      })
      .catch(() => {});
  }, []);

  const rewardCents = Math.round((parseFloat(rewardDollars) || 0) * 100);
  const slotCount = Math.max(parseInt(slots, 10) || 0, 0);
  const totalCost = rewardCents * slotCount;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (rewardCents <= 0) {
      setError("Reward per slot must be greater than zero.");
      return;
    }
    if (slotCount < 1) {
      setError("A task needs at least one slot.");
      return;
    }
    setSubmitting(true);
    try {
      const task = await api.createTask({
        title,
        description,
        topic_slug: topicSlug,
        reward_per_slot_cents: rewardCents,
        slots_total: slotCount,
      });
      router.push(`/tasks/${task.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create task");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Card size="4" variant="surface">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Heading size="6">Post a task</Heading>
          <Text size="2" color="gray">
            The total reward pool is held in escrow from your balance and paid out as you approve
            submissions.
          </Text>

          {error && (
            <Callout.Root color="red" size="1">
              <Callout.Text>{error}</Callout.Text>
            </Callout.Root>
          )}

          <label className="flex flex-col gap-1">
            <Text size="2" weight="medium">
              Title
            </Text>
            <TextInput
              size="3"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Build a landing page in Next.js"
              required
            />
          </label>

          <label className="flex flex-col gap-1">
            <Text size="2" weight="medium">
              Description
            </Text>
            <TextArea
              size="3"
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what needs to be done and how submissions will be judged."
              required
            />
          </label>

          <label className="flex flex-col gap-1">
            <Text size="2" weight="medium">
              Topic
            </Text>
            <Select.Root value={topicSlug} onValueChange={setTopicSlug}>
              <Select.Trigger />
              <Select.Content>
                {topics.map((topic) => (
                  <Select.Item key={topic.slug} value={topic.slug}>
                    {topic.name}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1">
              <Text size="2" weight="medium">
                Reward per slot (USD)
              </Text>
              <TextInput
                size="3"
                type="number"
                min="0"
                step="0.01"
                value={rewardDollars}
                onChange={(e) => setRewardDollars(e.target.value)}
                placeholder="25.00"
                required
              />
            </label>

            <label className="flex flex-col gap-1">
              <Text size="2" weight="medium">
                Number of slots
              </Text>
              <TextInput
                size="3"
                type="number"
                min="1"
                step="1"
                value={slots}
                onChange={(e) => setSlots(e.target.value)}
                required
              />
            </label>
          </div>

          <div className="flex items-center justify-between rounded-3 bg-gray-3 px-4 py-3">
            <Text size="2" color="gray">
              Total escrow (paid from your balance)
            </Text>
            <Text size="5" weight="bold" color="green">
              {formatCents(totalCost)}
            </Text>
          </div>

          <Button size="3" type="submit" color="orange" loading={submitting}>
            Fund and publish task
          </Button>
        </form>
      </Card>
    </div>
  );
}
