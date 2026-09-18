export const FETCH_STATS = "FETCH_STATS";
export const UPDATE_GLOBAL_STAT = "UPDATE_GLOBAL_STAT";
export const UPDATE_LOCAL_STAT = "UPDATE_LOCAL_STAT";

export const fetchStats = () => {
  return (dispatch, getState, getFirebase) => {
    const firebase = getFirebase();
    firebase
      .database()
      .ref("/stats")
      .once("value")
      .then(snapshot => {
        dispatch({ type: FETCH_STATS, payload: snapshot.val() });
      });
  };
};

export const updateGlobalStat = (stat, value) => {
  return (dispatch, getState, getFirebase) => {
    const stats = getState().stats.global;
    if (!stats.movesCount) return;
    const newValue = stats[stat] + 1;
    const firebase = getFirebase();
    firebase
      .database()
      .ref("/stats")
      .child(stat)
      .set(newValue)
      .then(snapshot => {
        dispatch({ type: UPDATE_GLOBAL_STAT, stat, newValue });
      });
  };
};

export const updateLocalStat = stat => {
  return (dispatch, getState) => {
    const stats = getState().stats.local;
    const newValue = stats[stat] + 1;
    dispatch({ type: UPDATE_LOCAL_STAT, stat, newValue });
  };
};
