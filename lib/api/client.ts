import type { User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import type {
  ApiErrorBody,
  ApiErrorCode,
  ApiErrorDetail,
  ApiErrorStatus,
} from "@/lib/api/types";

export class ApiError extends Error {
  status: ApiErrorStatus;
  code: ApiErrorCode;
  details: ApiErrorDetail[] | undefined;
  body: ApiErrorBody | null;

  constructor({
    status,
    code,
    message,
    body,
  }: {
    status: ApiErrorStatus;
    code: ApiErrorCode;
    message: string;
    body: ApiErrorBody | null;
  }) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = body?.error?.details;
    this.body = body;
  }
}

type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  user?: User | null;
};

type ApiDebugRequest = {
  path: string;
  headers: Record<string, string>;
};

declare global {
  interface Window {
    __TRIP_JOURNAL_LAST_API_REQUEST__?: ApiDebugRequest;
  }
}

function getApiBaseUrl() {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");
  }

  return baseUrl.replace(/\/$/, "");
}

function mapStatusToCode(status: number): ApiErrorCode {
  if (status === 401) return "unauthenticated";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 409) return "conflict";
  if (status === 422) return "validation_error";
  if (status >= 500) return "internal_error";
  return "unknown_error";
}

function getMessageFromBody(body: ApiErrorBody | null, fallback: string) {
  if (!body) return fallback;
  if (body.error?.message) return body.error.message;
  if (typeof body.detail === "string") return body.detail;
  if (body.message) return body.message;
  return fallback;
}

async function parseJsonSafely(response: Response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

async function getCurrentToken(userOverride?: User | null) {
  const user = userOverride ?? auth.currentUser;

  if (!user) {
    throw new ApiError({
      status: 401,
      code: "unauthenticated",
      message: "Sign in before calling the API.",
      body: null,
    });
  }

  return user.getIdToken();
}

export async function apiFetch<TResponse>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<TResponse> {
  const token = await getCurrentToken(options.user);
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);

  if (options.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (
    typeof window !== "undefined" &&
    process.env.NODE_ENV !== "production"
  ) {
    window.__TRIP_JOURNAL_LAST_API_REQUEST__ = {
      path,
      headers: Object.fromEntries(headers.entries()),
    };
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers,
    body:
      options.body === undefined || typeof options.body === "string"
        ? options.body
        : JSON.stringify(options.body),
  });

  if (!response.ok) {
    const body = (await parseJsonSafely(response)) as ApiErrorBody | null;
    const code = (body?.error?.code as ApiErrorCode | undefined) ?? mapStatusToCode(response.status);

    throw new ApiError({
      status: response.status,
      code,
      message: getMessageFromBody(body, `Request failed with ${response.status}`),
      body,
    });
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await parseJsonSafely(response)) as TResponse;
}

export async function publicApiFetch<TResponse>(
  path: string,
  options: Omit<RequestInit, "body"> & { body?: unknown } = {},
): Promise<TResponse> {
  const headers = new Headers(options.headers);

  if (options.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers,
    body:
      options.body === undefined || typeof options.body === "string"
        ? options.body
        : JSON.stringify(options.body),
  });

  if (!response.ok) {
    const body = (await parseJsonSafely(response)) as ApiErrorBody | null;
    const code =
      (body?.error?.code as ApiErrorCode | undefined) ??
      mapStatusToCode(response.status);

    throw new ApiError({
      status: response.status,
      code,
      message: getMessageFromBody(body, `Request failed with ${response.status}`),
      body,
    });
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await parseJsonSafely(response)) as TResponse;
}
