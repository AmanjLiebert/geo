export type ApplicationRole = "visitor" | "teacher" | "admin";

export type AccountUser = {
  id: string;
  role: ApplicationRole;
  status: "active" | "disabled";
  displayName: string | null;
  email: string | null;
  phone: string | null;
};

type SessionResponse = {
  user: AccountUser;
  expiresAt: string;
  csrfToken: string;
};

const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function getCurrentAccount(): Promise<AccountUser | null> {
  const response = await fetch(apiUrl("/api/v1/auth/me"), {
    credentials: "include",
    cache: "no-store",
  });
  if (response.status === 401) return null;
  if (!response.ok) throw await toApiError(response);
  const body = (await response.json()) as { user: AccountUser };
  return body.user;
}

export async function exchangeFirebaseToken(idToken: string, invitationToken?: string): Promise<SessionResponse> {
  const csrfResponse = await fetch(apiUrl("/api/v1/auth/csrf"), {
    credentials: "include",
    cache: "no-store",
  });
  if (!csrfResponse.ok) throw await toApiError(csrfResponse);
  const { csrfToken } = (await csrfResponse.json()) as { csrfToken: string };
  const response = await fetch(apiUrl("/api/v1/auth/session"), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
    body: JSON.stringify({ idToken, ...(invitationToken ? { invitationToken } : {}) }),
  });
  if (!response.ok) throw await toApiError(response);
  return (await response.json()) as SessionResponse;
}

export async function signOutSession(): Promise<void> {
  const csrfToken = readCookie(process.env.NEXT_PUBLIC_CSRF_COOKIE_NAME ?? "gk_csrf");
  const response = await fetch(apiUrl("/api/v1/auth/session"), {
    method: "DELETE",
    credentials: "include",
    headers: csrfToken ? { "X-CSRF-Token": csrfToken } : {},
  });
  if (!response.ok && response.status !== 401) throw await toApiError(response);
}

function apiUrl(path: string): string {
  return `${apiBaseUrl}${path}`;
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${encodeURIComponent(name)}=`;
  const match = document.cookie.split("; ").find((cookie) => cookie.startsWith(prefix));
  return match ? decodeURIComponent(match.slice(prefix.length)) : null;
}

async function toApiError(response: Response): Promise<ApiError> {
  let message = "The request could not be completed.";
  try {
    const body = (await response.json()) as { detail?: string; message?: string };
    message = body.detail ?? body.message ?? message;
  } catch {
    // Keep the safe generic message for non-JSON failures.
  }
  return new ApiError(message, response.status);
}
