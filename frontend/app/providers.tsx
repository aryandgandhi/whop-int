"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth";
import { Navbar } from "@/components/Navbar";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-1 text-gray-12">
        <Navbar />
        <main className="mx-auto w-full max-w-6xl px-4 py-8">{children}</main>
      </div>
    </AuthProvider>
  );
}
