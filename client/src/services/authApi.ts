import { apiRequest } from "./apiClient";
import type { User } from "../types";

export interface Credentials {
  displayName: string;
  password: string;
}
export interface RegisterPayload extends Credentials {
  email: string;
}
export interface TokenResponse {
  accessToken: string;
}

export const register = ({ email, password, displayName }: RegisterPayload) =>
  apiRequest<TokenResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, displayName })
  });

export const login = ({ displayName, password }: Credentials) =>
  apiRequest<TokenResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ displayName, password })
  });

export const me = () => apiRequest<User>("/auth/me");
