const TOKEN_KEY = "makao_access_token";

export const getToken = (): string | null => {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setToken = (token: string): void => {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // storage unavailable: the session just won't survive a page reload
  }
};

export const clearToken = (): void => {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // nothing to clear
  }
};
