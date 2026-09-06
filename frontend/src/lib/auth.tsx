"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiFetch } from "@/lib/api";

export interface AuthUser {
  id: number;
  email: string;
  created_at: string;
}

type AuthStatus = "loading" | "authenticated" | "anonymous";

interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  signup: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  // Resolve the current session once on mount. Any failure (401 or a
  // network error) just means "signed out" so the app stays usable.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const me = await apiFetch<AuthUser>("/api/auth/me");
        if (active) {
          setUser(me);
          setStatus("authenticated");
        }
      } catch {
        if (active) {
          setUser(null);
          setStatus("anonymous");
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const authenticate = useCallback(
    (path: string) => async (email: string, password: string) => {
      const me = await apiFetch<AuthUser>(path, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setUser(me);
      setStatus("authenticated");
    },
    []
  );

  const logout = useCallback(async () => {
    // Best-effort server call; the client is signed out regardless.
    try {
      await apiFetch<void>("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore - clearing local state below is what matters
    }
    setUser(null);
    setStatus("anonymous");
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      signup: authenticate("/api/auth/signup"),
      login: authenticate("/api/auth/login"),
      logout,
    }),
    [user, status, authenticate, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error("useAuth must be used within an <AuthProvider>");
  }
  return context;
}
