import { getToken, clearToken } from "./tokenStorage";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export class ApiError extends Error {
  constructor(method, path, status, body) {
    super(`${method} ${path} failed: ${status}`);
    this.status = status;
    this.body = body;
  }
}

let unauthorizedHandler = null;

export const setUnauthorizedHandler = handler => {
  unauthorizedHandler = handler;
};

export const apiRequest = async (path, options = {}) => {
  const token = getToken();
  const { headers, ...rest } = options;

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers
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

  return res.json();
};
