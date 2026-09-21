const TOKEN_KEY = "makao_access_token";

export const getToken = () => {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch (e) {
    return null;
  }
};

export const setToken = token => {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch (e) {
    // storage unavailable: the session just won't survive a page reload
  }
};

export const clearToken = () => {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch (e) {
    // nothing to clear
  }
};
