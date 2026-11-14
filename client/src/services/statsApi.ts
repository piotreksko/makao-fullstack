import { apiRequest } from "./apiClient";
import type { StatName, StatsFields } from "../types";

export const getStats = () => apiRequest<StatsFields>("/stats");

export const incrementStat = (field: StatName) =>
  apiRequest<StatsFields>("/stats/increment", {
    method: "POST",
    body: JSON.stringify({ field })
  });
