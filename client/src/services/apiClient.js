const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export const apiRequest = async (path, options = {}) => {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options
  });

  if (!res.ok) {
    throw new Error(`${options.method || "GET"} ${path} failed: ${res.status}`);
  }

  return res.json();
};
