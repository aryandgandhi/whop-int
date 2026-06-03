"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, Heading, Separator, Text, TextArea } from "@/components/ui";
import { Stars } from "@/components/Stars";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Profile, Review } from "@/lib/types";
import { formatCents, formatDate, statusLabel } from "@/lib/format";

export default function ProfilePage() {
  const params = useParams<{ id: string }>();
  const userId = params.id;
  const { user, refresh } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [p, r] = await Promise.all([api.getProfile(userId), api.userReviews(userId)]);
      setProfile(p);
      setReviews(r);
      setBio(p.bio ?? "");
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const isMe = !!user && user.id === userId;

  async function saveBio() {
    await api.updateMe({ bio });
    setEditing(false);
    await Promise.all([load(), refresh()]);
  }

  if (loading) return <Text color="gray">Loading...</Text>;
  if (!profile)
    return <Text color="gray">This profile could not be found.</Text>;

  return (
    <div className="flex flex-col gap-6">
      <Card size="4" variant="surface">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <Heading size="7">{profile.display_name}</Heading>
            <Stars rating={profile.avg_rating} count={profile.review_count} />
          </div>
          <Text size="2" color="gray">
            Member since {formatDate(profile.created_at)}
          </Text>

          {editing ? (
            <div className="flex flex-col gap-2">
              <TextArea
                size="2"
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell people what you do..."
              />
              <div className="flex gap-2">
                <Button size="1" color="orange" onClick={saveBio}>
                  Save
                </Button>
                <Button size="1" variant="soft" color="gray" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              {profile.bio && <Text size="3">{profile.bio}</Text>}
              {isMe && (
                <div>
                  <Button size="1" variant="soft" color="gray" onClick={() => setEditing(true)}>
                    {profile.bio ? "Edit bio" : "Add a bio"}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Tasks posted" value={String(profile.tasks_posted)} />
        <Stat label="Tasks completed" value={String(profile.tasks_completed)} />
        <Stat label="Total earned" value={formatCents(profile.total_earned_cents)} color="green" />
        <Stat
          label="Avg rating"
          value={profile.avg_rating !== null ? profile.avg_rating.toFixed(1) : "-"}
          color="amber"
        />
      </div>

      <Card size="4" variant="surface">
        <Heading size="5" className="mb-3">
          Reviews ({reviews.length})
        </Heading>
        {reviews.length === 0 ? (
          <Text color="gray">No reviews yet.</Text>
        ) : (
          <div className="flex flex-col">
            {reviews.map((rv, idx) => (
              <div key={rv.id}>
                {idx > 0 && <Separator size="4" />}
                <div className="flex flex-col gap-1 py-3">
                  <div className="flex items-center justify-between">
                    <Link href={`/u/${rv.reviewer.id}`} className="text-orange-11 underline">
                      <Text size="2" weight="medium">
                        {rv.reviewer.display_name}
                      </Text>
                    </Link>
                    <div className="flex items-center gap-2">
                      <Badge color="gray" variant="soft" size="1">
                        as {statusLabel(rv.role)}
                      </Badge>
                      <span className="text-amber-9">{"★".repeat(rv.rating)}</span>
                    </div>
                  </div>
                  {rv.comment && (
                    <Text size="2" color="gray">
                      {rv.comment}
                    </Text>
                  )}
                  <Text size="1" color="gray">
                    {formatDate(rv.created_at)}
                  </Text>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: "green" | "amber";
}) {
  return (
    <Card size="2" variant="surface">
      <Text size="1" color="gray">
        {label}
      </Text>
      <Heading size="6" color={color}>
        {value}
      </Heading>
    </Card>
  );
}
