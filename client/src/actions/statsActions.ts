import { getStats, incrementStat as incrementStatApi } from "../services/statsApi";
import type { AppThunk } from "../rootReducer";
import type { StatName, StatsFields } from "../types";

export const FETCH_STATS = "FETCH_STATS";
export const UPDATE_GLOBAL_STAT = "UPDATE_GLOBAL_STAT";
export const UPDATE_LOCAL_STAT = "UPDATE_LOCAL_STAT";

export type StatsAction =
  | { type: typeof FETCH_STATS; payload: StatsFields }
  | { type: typeof UPDATE_GLOBAL_STAT; stat: StatName; newValue: number }
  | { type: typeof UPDATE_LOCAL_STAT; stat: LocalStatName; newValue: number };

export type LocalStatName = "totalMoves" | "totalPlayerWins" | "totalComputerWins";

export const fetchStats = (): AppThunk<Promise<void>> => {
  return async dispatch => {
    const payload = await getStats();
    dispatch({ type: FETCH_STATS, payload });
  };
};

export const updateGlobalStat = (stat: StatName): AppThunk<Promise<void>> => {
  return async dispatch => {
    const updated = await incrementStatApi(stat);
    dispatch({ type: UPDATE_GLOBAL_STAT, stat, newValue: updated[stat] });
  };
};

export const updateLocalStat = (stat: LocalStatName): AppThunk => {
  return (dispatch, getState) => {
    const stats = getState().stats.local;
    const newValue = stats[stat] + 1;
    dispatch({ type: UPDATE_LOCAL_STAT, stat, newValue });
  };
};
