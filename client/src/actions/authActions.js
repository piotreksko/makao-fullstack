import {
  register as registerApi,
  login as loginApi,
  me as meApi
} from "../services/authApi";
import { getToken, setToken, clearToken } from "../services/tokenStorage";

export const AUTH_REQUEST = "AUTH_REQUEST";
export const AUTH_SUCCESS = "AUTH_SUCCESS";
export const AUTH_FAILURE = "AUTH_FAILURE";
export const AUTH_LOGOUT = "AUTH_LOGOUT";
export const AUTH_CLEAR_ERROR = "AUTH_CLEAR_ERROR";
export const SESSION_EXPIRED = "SESSION_EXPIRED";

const authErrorMessage = err => {
  switch (err.status) {
    case 400:
      return Array.isArray(err.body && err.body.message)
        ? err.body.message.join(". ")
        : "Please check the entered data.";
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

const authenticate = (request, payload) => async dispatch => {
  dispatch({ type: AUTH_REQUEST });
  try {
    const { accessToken } = await request(payload);
    setToken(accessToken);
    const user = await meApi();
    dispatch({ type: AUTH_SUCCESS, user, token: accessToken });
  } catch (err) {
    clearToken();
    dispatch({ type: AUTH_FAILURE, error: authErrorMessage(err) });
  }
};

export const loginUser = payload => authenticate(loginApi, payload);

export const registerUser = payload => authenticate(registerApi, payload);

export const restoreSession = () => async dispatch => {
  const token = getToken();
  if (!token) {
    return;
  }
  try {
    const user = await meApi();
    dispatch({ type: AUTH_SUCCESS, user, token });
  } catch (err) {
    // a 401 is already handled by sessionExpired via the api client
    if (err.status !== 401) {
      dispatch({ type: AUTH_FAILURE, error: authErrorMessage(err) });
    }
  }
};

export const logoutUser = () => {
  clearToken();
  return { type: AUTH_LOGOUT };
};

export const sessionExpired = () => ({ type: SESSION_EXPIRED });

export const clearAuthError = () => ({ type: AUTH_CLEAR_ERROR });
