import type { StoreAction } from "../actions/types";
import {
  FETCH_STATS,
  UPDATE_GLOBAL_STAT,
  UPDATE_LOCAL_STAT,
  type LocalStatName
} from "../actions/statsActions";
import type { StatsFields } from "../types";

export interface StatsState {
  local: Record<LocalStatName, number>;
  global: StatsFields;
}

const initialState: StatsState = {
  local: {
    totalMoves: 0,
    totalPlayerWins: 0,
    totalComputerWins: 0
  },
  global: {
    totalPlayerWins: 0,
    totalComputerWins: 0,
    totalMoves: 0,
    totalMacaoCalls: 0
  }
};

export default function statsReducer(
  state: StatsState = initialState,
  action: StoreAction
): StatsState {
  switch (action.type) {
    case FETCH_STATS:
    return { ...state, global: action.payload };
    case UPDATE_GLOBAL_STAT:
      return {
        ...state,
        global: {
          ...state.global,
          [action.stat]: action.newValue
        }
      };
    case UPDATE_LOCAL_STAT:
      return {
        ...state,
        local: {
          ...state.local,
          [action.stat]: action.newValue
        }
      };
    default:
      return state;
  }
}
