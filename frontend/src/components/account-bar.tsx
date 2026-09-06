"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

/** Thin strip showing who is signed in, with a sign-out action. */
export function AccountBar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await logout();
    router.replace("/login");
  }

  return (
    <div className="border-b border-slate-200 bg-[#032147] text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-2 text-sm">
        <span className="font-semibold">Prelegal</span>
        <div className="flex items-center gap-3">
          {user && <span className="text-slate-300">{user.email}</span>}
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="rounded border border-white/30 px-2 py-1 text-xs font-medium transition hover:bg-white/10 disabled:opacity-60"
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </div>
    </div>
  );
}
