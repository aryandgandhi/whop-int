"use client";

import { useState } from "react";
import { Button, Callout, Text, TextArea } from "@/components/ui";
import { api } from "@/lib/api";

export function ReviewForm({
  submissionId,
  prompt,
  onDone,
}: {
  submissionId: string;
  prompt: string;
  onDone: () => void;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.reviewSubmission(submissionId, rating, comment);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit review");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 rounded-3 bg-gray-3 p-3">
      <Text size="2" weight="medium">
        {prompt}
      </Text>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            className={`text-xl ${n <= rating ? "text-amber-9" : "text-gray-6"}`}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
          >
            ★
          </button>
        ))}
      </div>
      <TextArea
        size="2"
        rows={2}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Add a comment (optional)"
      />
      {error && (
        <Callout.Root color="red" size="1">
          <Callout.Text>{error}</Callout.Text>
        </Callout.Root>
      )}
      <div>
        <Button size="1" type="submit" color="orange" loading={submitting}>
          Submit review
        </Button>
      </div>
    </form>
  );
}
