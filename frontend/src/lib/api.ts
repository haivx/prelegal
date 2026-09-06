/**
 * Thin wrapper around `fetch` for the Prelegal backend.
 *
 * In the shipped build the frontend is served by FastAPI on the same
 * origin, so requests go to a relative `/api/...` path. For a split local
 * setup (`next dev` on :3000, backend on :8000) set
 * `NEXT_PUBLIC_API_BASE=http://localhost:8000`.
 */
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    // Send/receive the session cookie.
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const isJson = response.headers
    .get("content-type")
    ?.includes("application/json");
  const body = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const detail =
      (isJson && typeof body === "object" && body && "detail" in body
        ? String((body as { detail: unknown }).detail)
        : null) ?? `Request failed (${response.status})`;
    throw new ApiError(response.status, detail);
  }

  return body as T;
}
