"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Heading, Text, TextInput } from "@/components/ui";
import { api } from "@/lib/api";
import type { Task, Topic } from "@/lib/types";
import { TaskCard } from "@/components/TaskCard";

export default function MarketplacePage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.topics().then(setTopics).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .listTasks({ topic: activeTopic ?? undefined, q: query || undefined, page_size: 60 })
      .then((res) => setTasks(res.items))
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  }, [activeTopic, query]);

  const topicTabs = useMemo(
    () => [{ slug: null as string | null, name: "All" }, ...topics],
    [topics],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Heading size="8" weight="bold">
          Find work. Get it done.
        </Heading>
        <Text size="3" color="gray">
          Browse open tasks across every topic. Pick one, submit your work, and get paid from
          the reward pool.
        </Text>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(search);
        }}
        className="flex gap-2"
      >
        <div className="flex-1">
          <TextInput
            size="3"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button size="3" type="submit" variant="soft" color="gray">
          Search
        </Button>
      </form>

      <div className="flex flex-wrap gap-2">
        {topicTabs.map((topic) => {
          const isActive = activeTopic === topic.slug;
          return (
            <Button
              key={topic.slug ?? "all"}
              size="2"
              variant={isActive ? "solid" : "soft"}
              color={isActive ? "orange" : "gray"}
              onClick={() => setActiveTopic(topic.slug)}
            >
              {topic.name}
            </Button>
          );
        })}
      </div>

      {loading ? (
        <Text color="gray">Loading tasks...</Text>
      ) : tasks.length === 0 ? (
        <div className="rounded-3 border border-dashed border-gray-5 p-10 text-center">
          <Text color="gray">No tasks here yet. Be the first to post one.</Text>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}
