import { apiRequest } from "./apiClient";

export const register = ({ email, password, displayName }) =>
  apiRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, displayName })
  });

export const login = ({ displayName, password }) =>
  apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify({ displayName, password })
  });

export const me = () => apiRequest("/auth/me");
