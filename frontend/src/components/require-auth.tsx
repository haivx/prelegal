"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

/**
 * Client-side gate for the platform. The frontend is a static export with
 * no server middleware, so the redirect happens here once `AuthProvider`
 * has resolved the current session.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "anonymous") {
      router.replace("/login");
    }
  }, [status, router]);

  if (status !== "authenticated") {
    return (
      <div
        className="flex min-h-full items-center justify-center bg-slate-100 p-8 text-sm text-slate-500"
        role="status"
      >
        {status === "loading" ? "Loading…" : "Redirecting to sign in…"}
      </div>
    );
  }

  return <>{children}</>;
}
