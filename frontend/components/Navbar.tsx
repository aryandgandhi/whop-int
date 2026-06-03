"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge, Button, Heading, Text } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { formatCents } from "@/lib/format";

export function Navbar() {
  const { user, logout, loading } = useAuth();
  const [available, setAvailable] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    if (user) {
      api
        .wallet()
        .then((w) => {
          if (active) setAvailable(w.available_cents);
        })
        .catch(() => {});
    } else {
      setAvailable(null);
    }
    return () => {
      active = false;
    };
  }, [user]);

  return (
    <header className="border-b border-gray-4 bg-gray-2">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <Heading size="5" weight="bold">
            WAP
          </Heading>
          <Text size="2" color="gray">
            Marketplace
          </Text>
        </Link>

        <nav className="flex items-center gap-3">
          {loading ? null : user ? (
            <>
              <Link href="/tasks/new">
                <Button size="2" variant="solid" color="orange">
                  Post a task
                </Button>
              </Link>
              {available !== null && (
                <Link href="/dashboard">
                  <Badge size="2" color="green" variant="soft">
                    {formatCents(available)}
                  </Badge>
                </Link>
              )}
              <Link href="/dashboard">
                <Button size="2" variant="soft" color="gray">
                  {user.display_name}
                </Button>
              </Link>
              <Button size="2" variant="ghost" color="gray" onClick={logout}>
                Log out
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button size="2" variant="soft" color="gray">
                  Sign in
                </Button>
              </Link>
              <Link href="/register">
                <Button size="2" variant="solid" color="orange">
                  Get started
                </Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
