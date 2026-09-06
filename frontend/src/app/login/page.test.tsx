import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "./page";
import { ApiError } from "@/lib/api";

const mockAuth = {
  status: "anonymous" as "loading" | "authenticated" | "anonymous",
  user: null,
  login: vi.fn(),
  signup: vi.fn(),
  logout: vi.fn(),
};

const replace = vi.fn();

vi.mock("@/lib/auth", () => ({ useAuth: () => mockAuth }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

beforeEach(() => {
  mockAuth.status = "anonymous";
  mockAuth.login.mockReset().mockResolvedValue(undefined);
  mockAuth.signup.mockReset().mockResolvedValue(undefined);
  replace.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

async function fillCredentials(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/email/i), "founder@acmecorp.com");
  await user.type(screen.getByLabelText(/password/i), "correct horse battery");
}

describe("LoginPage", () => {
  it("signs in and redirects to the platform on success", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await fillCredentials(user);
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    await waitFor(() =>
      expect(mockAuth.login).toHaveBeenCalledWith(
        "founder@acmecorp.com",
        "correct horse battery"
      )
    );
    expect(mockAuth.signup).not.toHaveBeenCalled();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
  });

  it("creates an account when in sign-up mode", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.click(screen.getByRole("tab", { name: /create account/i }));
    await fillCredentials(user);
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() =>
      expect(mockAuth.signup).toHaveBeenCalledWith(
        "founder@acmecorp.com",
        "correct horse battery"
      )
    );
    expect(mockAuth.login).not.toHaveBeenCalled();
  });

  it("shows the API error and stays on the page when credentials are wrong", async () => {
    mockAuth.login.mockRejectedValueOnce(
      new ApiError(401, "Incorrect email or password")
    );
    const user = userEvent.setup();
    render(<LoginPage />);

    await fillCredentials(user);
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    expect(
      await screen.findByText(/incorrect email or password/i)
    ).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /^sign in$/i })).toBeEnabled();
  });

  it("redirects away if the visitor is already authenticated", async () => {
    mockAuth.status = "authenticated";
    render(<LoginPage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
  });
});
