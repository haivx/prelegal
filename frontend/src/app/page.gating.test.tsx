import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import HomePage from "./page";

const mockAuth = {
  status: "loading" as "loading" | "authenticated" | "anonymous",
  user: null as null | { id: number; email: string; created_at: string },
  login: vi.fn(),
  signup: vi.fn(),
  logout: vi.fn().mockResolvedValue(undefined),
};

const replace = vi.fn();

vi.mock("@/lib/auth", () => ({ useAuth: () => mockAuth }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

// The NDA creator pulls in html2pdf.js via a dynamic import on submit; it is
// never triggered here but keep it out of the module graph to be safe.
vi.mock("@/lib/download-pdf", () => ({ downloadElementAsPdf: vi.fn() }));

beforeEach(() => {
  mockAuth.status = "loading";
  mockAuth.user = null;
  replace.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("HomePage auth gate", () => {
  it("shows a loading state while the session resolves", () => {
    mockAuth.status = "loading";
    render(<HomePage />);

    expect(screen.getByRole("status")).toHaveTextContent(/loading/i);
    expect(screen.queryByLabelText(/party 1 name/i)).not.toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("redirects anonymous visitors to the login screen", async () => {
    mockAuth.status = "anonymous";
    render(<HomePage />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
    expect(screen.queryByLabelText(/party 1 name/i)).not.toBeInTheDocument();
  });

  it("renders the platform (and account bar) once authenticated", () => {
    mockAuth.status = "authenticated";
    mockAuth.user = {
      id: 1,
      email: "founder@acmecorp.com",
      created_at: "2026-01-01T00:00:00Z",
    };
    render(<HomePage />);

    expect(screen.getByLabelText(/party 1 name/i)).toBeInTheDocument();
    expect(screen.getByText("founder@acmecorp.com")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign out/i })
    ).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
