import { getStats, incrementStat as incrementStatApi } from "../services/statsApi";

export const FETCH_STATS = "FETCH_STATS";
export const UPDATE_GLOBAL_STAT = "UPDATE_GLOBAL_STAT";
export const UPDATE_LOCAL_STAT = "UPDATE_LOCAL_STAT";

export const fetchStats = () => {
  return async dispatch => {
    const payload = await getStats();
    dispatch({ type: FETCH_STATS, payload });
  };
};

export const updateGlobalStat = stat => {
  return async dispatch => {
    const updated = await incrementStatApi(stat);
    dispatch({ type: UPDATE_GLOBAL_STAT, stat, newValue: updated[stat] });
  };
};

export const updateLocalStat = stat => {
  return (dispatch, getState) => {
    const stats = getState().stats.local;
    const newValue = stats[stat] + 1;
    dispatch({ type: UPDATE_LOCAL_STAT, stat, newValue });
  };
};
