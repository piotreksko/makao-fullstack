import { getToken, clearToken } from "./tokenStorage";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export class ApiError extends Error {
  status: number;
  body: { message?: string | string[] } | null;

  constructor(
    method: string,
    path: string,
    status: number,
    body: { message?: string | string[] } | null
  ) {
    super(`${method} ${path} failed: ${status}`);
    this.status = status;
    this.body = body;
  }
}

let unauthorizedHandler: (() => void) | null = null;

export const setUnauthorizedHandler = (handler: () => void): void => {
  unauthorizedHandler = handler;
};

export const apiRequest = async <T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = getToken();
  const { headers, ...rest } = options;

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers as Record<string, string> | undefined)
    }
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    if (res.status === 401 && token) {
      clearToken();
      if (unauthorizedHandler) {
        unauthorizedHandler();
      }
    }
    throw new ApiError(options.method || "GET", path, res.status, body);
  }

  if (res.status === 204) return null as T;
  return res.json() as Promise<T>;
};

// The server's validation errors come back as message: string[]
export const validationMessages = (err: {
  body?: { message?: string | string[] } | null;
}): string[] | null => {
  const message = err.body?.message;
  return Array.isArray(message) ? message : null;
};
