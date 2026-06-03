"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Button,
  Callout,
  Card,
  Heading,
  Separator,
  Text,
  TextArea,
} from "@/components/ui";
import { ReviewForm } from "@/components/ReviewForm";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Submission, Task } from "@/lib/types";
import { formatCents, formatDate, statusColor, statusLabel } from "@/lib/format";

function ProfileLink({ id, name }: { id: string; name: string }) {
  return (
    <Link href={`/u/${id}`} className="text-orange-11 underline">
      {name}
    </Link>
  );
}

export default function TaskDetailPage() {
  const params = useParams<{ id: string }>();
  const taskId = params.id;
  const { user } = useAuth();

  const [task, setTask] = useState<Task | null>(null);
  const [mine, setMine] = useState<Submission | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [pitch, setPitch] = useState("");
  const [work, setWork] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [reviewed, setReviewed] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const isPoster = !!user && !!task && user.id === task.poster.id;

  const loadTask = useCallback(async () => {
    try {
      setTask(await api.getTask(taskId));
    } catch {
      setError("Task not found.");
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  const loadSide = useCallback(async () => {
    if (!user || !task) return;
    if (user.id === task.poster.id) {
      try {
        setSubmissions(await api.listTaskSubmissions(taskId));
      } catch {
        /* ignore */
      }
    } else {
      try {
        setMine(await api.myEngagement(taskId));
      } catch {
        setMine(null);
      }
    }
  }, [user, task, taskId]);

  useEffect(() => {
    loadTask();
  }, [loadTask]);
  useEffect(() => {
    loadSide();
  }, [loadSide]);

  async function act(fn: () => Promise<unknown>) {
    setError(null);
    setBusy(true);
    try {
      await fn();
      await Promise.all([loadTask(), loadSide()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Text color="gray">Loading...</Text>;
  if (!task)
    return (
      <Callout.Root color="red">
        <Callout.Text>This task could not be found.</Callout.Text>
      </Callout.Root>
    );

  const acceptingVolunteers =
    task.status === "open" || (task.status === "in_progress" && task.slots_remaining > 0);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/">
        <Text size="2" color="gray">
          &larr; Back to marketplace
        </Text>
      </Link>

      {error && (
        <Callout.Root color="red">
          <Callout.Text>{error}</Callout.Text>
        </Callout.Root>
      )}

      <Card size="4" variant="surface">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge color="gray" variant="soft">
              {task.topic_slug}
            </Badge>
            <Badge color={statusColor(task.status)} variant="soft">
              {statusLabel(task.status)}
            </Badge>
          </div>

          <Heading size="7">{task.title}</Heading>

          <div className="flex flex-wrap items-center gap-6">
            <div>
              <Text size="6" weight="bold" color="green">
                {formatCents(task.reward_per_slot_cents, task.currency)}
              </Text>
              <Text size="2" color="gray">
                {" "}
                per slot
              </Text>
            </div>
            <div>
              <Text size="3" weight="medium">
                {task.slots_remaining} of {task.slots_total}
              </Text>
              <Text size="2" color="gray">
                {" "}
                slots open &middot; {task.slots_completed} completed
              </Text>
            </div>
            <Text size="2" color="gray">
              Posted by <ProfileLink id={task.poster.id} name={task.poster.display_name} /> on{" "}
              {formatDate(task.created_at)}
            </Text>
          </div>

          <Separator size="4" />

          <Text size="3" className="whitespace-pre-wrap">
            {task.description}
          </Text>

          {isPoster && task.status !== "completed" && task.status !== "cancelled" && (
            <div>
              <Button
                color="red"
                variant="soft"
                disabled={busy}
                onClick={() => act(() => api.cancelTask(taskId))}
              >
                Cancel task and refund unpaid escrow
              </Button>
            </div>
          )}
        </div>
      </Card>

      {isPoster ? (
        <PosterPanel
          submissions={submissions}
          task={task}
          busy={busy}
          reviewed={reviewed}
          onAccept={(id) => act(() => api.acceptVolunteer(id))}
          onReject={(id) => act(() => api.rejectVolunteer(id))}
          onComplete={(id) => act(() => api.completeSubmission(id))}
          onReviewed={(id) => {
            setReviewed((s) => new Set(s).add(id));
            loadSide();
          }}
        />
      ) : (
        <WorkerPanel
          user={user}
          mine={mine}
          acceptingVolunteers={acceptingVolunteers}
          slotsRemaining={task.slots_remaining}
          pitch={pitch}
          setPitch={setPitch}
          work={work}
          setWork={setWork}
          busy={busy}
          reviewed={reviewed}
          onVolunteer={() => act(() => api.volunteer(taskId, pitch))}
          onSubmitWork={(id) => act(() => api.submitWork(id, work))}
          onWithdraw={(id) => act(() => api.withdraw(id))}
          onReviewed={(id) => {
            setReviewed((s) => new Set(s).add(id));
            loadSide();
          }}
        />
      )}
    </div>
  );
}

function PosterPanel({
  submissions,
  task,
  busy,
  reviewed,
  onAccept,
  onReject,
  onComplete,
  onReviewed,
}: {
  submissions: Submission[];
  task: Task;
  busy: boolean;
  reviewed: Set<string>;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onComplete: (id: string) => void;
  onReviewed: (id: string) => void;
}) {
  const active = submissions.filter((s) => !["rejected", "withdrawn"].includes(s.status));
  const inactive = submissions.filter((s) => ["rejected", "withdrawn"].includes(s.status));

  return (
    <Card size="4" variant="surface">
      <div className="flex flex-col gap-4">
        <Heading size="5">Volunteers ({submissions.length})</Heading>
        {submissions.length === 0 && <Text color="gray">No volunteers yet.</Text>}

        {active.map((s) => (
          <div key={s.id} className="rounded-3 border border-gray-4 p-4">
            <div className="mb-2 flex items-center justify-between">
              <ProfileLink id={s.worker.id} name={s.worker.display_name} />
              <Badge color={statusColor(s.status)} variant="soft" size="1">
                {statusLabel(s.status)}
              </Badge>
            </div>
            {s.pitch && (
              <Text size="2" color="gray" className="whitespace-pre-wrap">
                {s.pitch}
              </Text>
            )}
            {s.status === "submitted" && s.content && (
              <div className="mt-2 rounded-2 bg-gray-3 p-3">
                <Text size="1" color="gray">
                  Delivered work
                </Text>
                <Text size="2" className="whitespace-pre-wrap">
                  {s.content}
                </Text>
              </div>
            )}
            <div className="mt-3 flex gap-2">
              {s.status === "volunteered" && (
                <>
                  <Button
                    size="1"
                    color="green"
                    disabled={busy || task.slots_remaining === 0}
                    onClick={() => onAccept(s.id)}
                  >
                    Accept
                  </Button>
                  <Button size="1" color="red" variant="soft" disabled={busy} onClick={() => onReject(s.id)}>
                    Pass
                  </Button>
                </>
              )}
              {s.status === "submitted" && (
                <Button size="1" color="green" disabled={busy} onClick={() => onComplete(s.id)}>
                  Confirm &amp; pay
                </Button>
              )}
            </div>
            {s.status === "completed" && !reviewed.has(s.id) && (
              <div className="mt-3">
                <ReviewForm
                  submissionId={s.id}
                  prompt={`Rate ${s.worker.display_name}`}
                  onDone={() => onReviewed(s.id)}
                />
              </div>
            )}
          </div>
        ))}

        {inactive.length > 0 && (
          <div className="flex flex-col gap-1 opacity-70">
            {inactive.map((s) => (
              <Text key={s.id} size="1" color="gray">
                {s.worker.display_name} - {statusLabel(s.status)}
              </Text>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function WorkerPanel({
  user,
  mine,
  acceptingVolunteers,
  slotsRemaining,
  pitch,
  setPitch,
  work,
  setWork,
  busy,
  reviewed,
  onVolunteer,
  onSubmitWork,
  onWithdraw,
  onReviewed,
}: {
  user: { id: string } | null;
  mine: Submission | null;
  acceptingVolunteers: boolean;
  slotsRemaining: number;
  pitch: string;
  setPitch: (v: string) => void;
  work: string;
  setWork: (v: string) => void;
  busy: boolean;
  reviewed: Set<string>;
  onVolunteer: () => void;
  onSubmitWork: (id: string) => void;
  onWithdraw: (id: string) => void;
  onReviewed: (id: string) => void;
}) {
  return (
    <Card size="4" variant="surface">
      <div className="flex flex-col gap-4">
        <Heading size="5">Your involvement</Heading>

        {!user ? (
          <Text color="gray">
            <Link href="/login" className="text-orange-11 underline">
              Sign in
            </Link>{" "}
            to volunteer for this task.
          </Text>
        ) : !mine ? (
          acceptingVolunteers && slotsRemaining > 0 ? (
            <div className="flex flex-col gap-3">
              <Text size="2" color="gray">
                Volunteer for this task. Your profile and pitch are shown to the poster, who
                accepts volunteers into the {slotsRemaining} open slot(s).
              </Text>
              <TextArea
                size="3"
                rows={4}
                value={pitch}
                onChange={(e) => setPitch(e.target.value)}
                placeholder="Why are you a good fit? (optional)"
              />
              <div>
                <Button size="3" color="orange" disabled={busy} onClick={onVolunteer}>
                  Volunteer for this task
                </Button>
              </div>
            </div>
          ) : (
            <Text color="gray">This task is not accepting volunteers right now.</Text>
          )
        ) : (
          <div className="flex flex-col gap-3">
            <Badge color={statusColor(mine.status)} variant="soft" size="2" className="self-start">
              {statusLabel(mine.status)}
            </Badge>

            {mine.status === "volunteered" && (
              <Text size="2" color="gray">
                You volunteered. Waiting for the poster to accept you into a slot.
              </Text>
            )}

            {mine.status === "accepted" && (
              <div className="flex flex-col gap-2">
                <Text size="2" color="gray">
                  You were accepted. Submit your work below.
                </Text>
                <TextArea
                  size="3"
                  rows={5}
                  value={work}
                  onChange={(e) => setWork(e.target.value)}
                  placeholder="Describe your work, paste links, etc."
                />
                <div>
                  <Button
                    size="3"
                    color="orange"
                    disabled={busy || !work}
                    onClick={() => onSubmitWork(mine.id)}
                  >
                    Submit work
                  </Button>
                </div>
              </div>
            )}

            {mine.status === "submitted" && (
              <Text size="2" color="gray">
                Work submitted. Waiting for the poster to confirm and release payment.
              </Text>
            )}

            {mine.status === "completed" && (
              <div className="flex flex-col gap-2">
                <Text size="2" color="green">
                  Completed and paid. Nice work!
                </Text>
                {!reviewed.has(mine.id) && (
                  <ReviewForm
                    submissionId={mine.id}
                    prompt="Rate the poster"
                    onDone={() => onReviewed(mine.id)}
                  />
                )}
              </div>
            )}

            {mine.status === "rejected" && (
              <Text size="2" color="gray">
                You weren&apos;t selected for this task.
              </Text>
            )}
            {mine.status === "withdrawn" && (
              <Text size="2" color="gray">
                You withdrew from this task.
              </Text>
            )}

            {["volunteered", "accepted"].includes(mine.status) && (
              <div>
                <Button
                  size="1"
                  variant="soft"
                  color="gray"
                  disabled={busy}
                  onClick={() => onWithdraw(mine.id)}
                >
                  Withdraw
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
