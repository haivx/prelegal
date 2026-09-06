"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Mode = "login" | "signup";

const MIN_PASSWORD_LENGTH = 8;

const inputClasses =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-[#209dd7] focus:outline-none focus:ring-1 focus:ring-[#209dd7]";
const labelClasses = "block text-sm font-medium text-slate-700";

export default function LoginPage() {
  const router = useRouter();
  const { status, login, signup } = useAuth();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already signed in (e.g. navigated here manually) - go to the platform.
  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/");
    }
  }, [status, router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await signup(email, password);
      }
      router.replace("/");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Something went wrong. Please try again."
      );
      setSubmitting(false);
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
  }

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-slate-100 px-6 py-12">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-[#032147]">Prelegal</h1>
        <p className="mt-1 text-sm text-[#888888]">
          {mode === "login"
            ? "Sign in to draft your legal agreements."
            : "Create an account to get started."}
        </p>

        <div
          className="mt-6 grid grid-cols-2 gap-1 rounded-md bg-slate-100 p-1 text-sm font-medium"
          role="tablist"
          aria-label="Authentication mode"
        >
          {(["login", "signup"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={mode === value}
              onClick={() => switchMode(value)}
              className={`rounded px-3 py-1.5 transition ${
                mode === value
                  ? "bg-white text-[#032147] shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {value === "login" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className={labelClasses} htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className={`mt-1 ${inputClasses}`}
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className={labelClasses} htmlFor="password">
              Password
            </label>
            <input
              id="password"
              className={`mt-1 ${inputClasses}`}
              type="password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              required
              minLength={MIN_PASSWORD_LENGTH}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {mode === "signup" && (
              <p className="mt-1 text-xs text-[#888888]">
                At least {MIN_PASSWORD_LENGTH} characters.
              </p>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-[#753991] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#5f2e74] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting
              ? "Please wait…"
              : mode === "login"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-[#888888]">
          This is a prototype login. No email is verified.
        </p>
      </div>
    </div>
  );
}
