import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import * as api from "@/lib/api";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, apiFetch: vi.fn() };
});

const apiFetchMock = vi.mocked(api.apiFetch);

const USER = { id: 7, email: "founder@acmecorp.com", created_at: "2026-01-01T00:00:00Z" };

function Probe() {
  const { status, user, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="email">{user?.email ?? "-"}</span>
      <button onClick={() => login("founder@acmecorp.com", "password123")}>
        login
      </button>
      <button onClick={() => logout()}>logout</button>
    </div>
  );
}

beforeEach(() => {
  apiFetchMock.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("AuthProvider", () => {
  it("resolves to anonymous when /me returns 401", async () => {
    apiFetchMock.mockRejectedValueOnce(new ApiError(401, "Not signed in"));
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId("status")).toHaveTextContent("anonymous")
    );
  });

  it("hydrates the current user when /me succeeds", async () => {
    apiFetchMock.mockResolvedValueOnce(USER);
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId("status")).toHaveTextContent("authenticated")
    );
    expect(screen.getByTestId("email")).toHaveTextContent("founder@acmecorp.com");
  });

  it("logs in and then clears the user on logout", async () => {
    const user = userEvent.setup();
    apiFetchMock
      .mockRejectedValueOnce(new ApiError(401, "Not signed in")) // initial /me
      .mockResolvedValueOnce(USER) // POST /login
      .mockResolvedValueOnce(undefined); // POST /logout
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await waitFor(() =>
      expect(screen.getByTestId("status")).toHaveTextContent("anonymous")
    );

    await user.click(screen.getByRole("button", { name: "login" }));
    await waitFor(() =>
      expect(screen.getByTestId("status")).toHaveTextContent("authenticated")
    );
    expect(apiFetchMock).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({ method: "POST" })
    );

    await user.click(screen.getByRole("button", { name: "logout" }));
    await waitFor(() =>
      expect(screen.getByTestId("status")).toHaveTextContent("anonymous")
    );
  });
});
