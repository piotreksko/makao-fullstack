import {
  AUTH_REQUEST,
  AUTH_SUCCESS,
  AUTH_FAILURE,
  AUTH_LOGOUT,
  AUTH_CLEAR_ERROR,
  SESSION_EXPIRED
} from "../actions/authActions";
import { getToken } from "../services/tokenStorage";

const savedToken = getToken();

const initialState = {
  user: null,
  token: savedToken,
  loading: false,
  initializing: Boolean(savedToken),
  error: null
};

const loggedOut = {
  user: null,
  token: null,
  loading: false,
  initializing: false,
  error: null
};

export default function(state = initialState, action) {
  switch (action.type) {
    case AUTH_REQUEST:
      return { ...state, loading: true, error: null };
    case AUTH_SUCCESS:
      return {
        user: action.user,
        token: action.token,
        loading: false,
        initializing: false,
        error: null
      };
    case AUTH_FAILURE:
      return {
        ...state,
        loading: false,
        initializing: false,
        error: action.error
      };
    case AUTH_LOGOUT:
      return loggedOut;
    case SESSION_EXPIRED:
      return {
        ...loggedOut,
        error: "Your session has expired. Please log in again."
      };
    case AUTH_CLEAR_ERROR:
      return { ...state, error: null };
    default:
      return state;
  }
}
