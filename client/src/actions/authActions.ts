import {
  register as registerApi,
  login as loginApi,
  me as meApi
} from "../services/authApi";
import { getToken, setToken, clearToken } from "../services/tokenStorage";
import { connectSocket, disconnectSocket } from "../services/socket";
import { validationMessages, type ApiError } from "../services/apiClient";
import type { Credentials, RegisterPayload, TokenResponse } from "../services/authApi";
import type { AppThunk } from "../rootReducer";
import type { User } from "../types";

export const AUTH_REQUEST = "AUTH_REQUEST";
export const AUTH_SUCCESS = "AUTH_SUCCESS";
export const AUTH_FAILURE = "AUTH_FAILURE";
export const AUTH_LOGOUT = "AUTH_LOGOUT";
export const AUTH_CLEAR_ERROR = "AUTH_CLEAR_ERROR";
export const SESSION_EXPIRED = "SESSION_EXPIRED";

export type AuthAction =
  | { type: typeof AUTH_REQUEST }
  | { type: typeof AUTH_SUCCESS; user: User; token: string }
  | { type: typeof AUTH_FAILURE; error: string }
  | { type: typeof AUTH_LOGOUT }
  | { type: typeof AUTH_CLEAR_ERROR }
  | { type: typeof SESSION_EXPIRED };

// What a failed request looks like: an ApiError, or a bare network error with
// no status
type RequestError = Partial<Pick<ApiError, "status" | "body">>;

const authErrorMessage = (err: RequestError) => {
  switch (err.status) {
    case 400:
      return validationMessages(err)?.join(". ") ?? "Please check the entered data.";
    case 401:
      return "Wrong display name or password.";
    case 409:
      return "That display name or email is already taken.";
    case undefined:
      return "Could not reach the server. Please try again.";
    default:
      return "Something went wrong. Please try again.";
  }
};

const authenticate =
  <P>(request: (payload: P) => Promise<TokenResponse>, payload: P): AppThunk<Promise<void>> =>
  async dispatch => {
  dispatch({ type: AUTH_REQUEST });
  try {
    const { accessToken } = await request(payload);
    setToken(accessToken);
    const user = await meApi();
    connectSocket();
    dispatch({ type: AUTH_SUCCESS, user, token: accessToken });
  } catch (err) {
    clearToken();
    dispatch({ type: AUTH_FAILURE, error: authErrorMessage(err as RequestError) });
  }
};

export const loginUser = (payload: Credentials) => authenticate(loginApi, payload);

export const registerUser = (payload: RegisterPayload) => authenticate(registerApi, payload);

export const restoreSession = (): AppThunk<Promise<void>> => async dispatch => {
  const token = getToken();
  if (!token) {
    return;
  }
  try {
    const user = await meApi();
    connectSocket();
    dispatch({ type: AUTH_SUCCESS, user, token });
  } catch (err) {
    // a 401 is already handled by sessionExpired via the api client
    if ((err as RequestError).status !== 401) {
      dispatch({ type: AUTH_FAILURE, error: authErrorMessage(err as RequestError) });
    }
  }
};

export const logoutUser = (): AuthAction => {
  clearToken();
  disconnectSocket();
  return { type: AUTH_LOGOUT };
};

export const sessionExpired = (): AuthAction => {
  disconnectSocket();
  return { type: SESSION_EXPIRED };
};

export const clearAuthError = (): AuthAction => ({ type: AUTH_CLEAR_ERROR });
