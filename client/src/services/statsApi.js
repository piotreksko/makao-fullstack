import { apiRequest } from "./apiClient";

export const getStats = () => apiRequest("/stats");

export const incrementStat = field =>
  apiRequest("/stats/increment", {
    method: "POST",
    body: JSON.stringify({ field })
  });
