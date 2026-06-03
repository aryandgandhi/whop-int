"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { Button, Callout, Card, Heading, Text, TextInput } from "@/components/ui";
import { useAuth } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register(email, displayName, password);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <Card size="4" variant="surface">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Heading size="6">Create your account</Heading>
          <Text size="2" color="gray">
            You will get demo credits to fund your first task.
          </Text>

          {error && (
            <Callout.Root color="red" size="1">
              <Callout.Text>{error}</Callout.Text>
            </Callout.Root>
          )}

          <label className="flex flex-col gap-1">
            <Text size="2" weight="medium">
              Display name
            </Text>
            <TextInput
              size="3"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </label>

          <label className="flex flex-col gap-1">
            <Text size="2" weight="medium">
              Email
            </Text>
            <TextInput
              size="3"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label className="flex flex-col gap-1">
            <Text size="2" weight="medium">
              Password
            </Text>
            <TextInput
              size="3"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
            <Text size="1" color="gray">
              At least 8 characters.
            </Text>
          </label>

          <Button size="3" type="submit" color="orange" loading={submitting}>
            Create account
          </Button>

          <Text size="2" color="gray">
            Already have an account?{" "}
            <Link href="/login" className="text-orange-11 underline">
              Sign in
            </Link>
          </Text>
        </form>
      </Card>
    </div>
  );
}
