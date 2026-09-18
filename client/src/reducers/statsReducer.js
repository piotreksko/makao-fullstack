import { FETCH_STATS } from "../actions/statsActions";
import { UPDATE_GLOBAL_STAT } from "../actions/statsActions";
import { UPDATE_LOCAL_STAT } from "../actions/statsActions";

const initialState = {
  local: {
    movesCount: 0,
    playerWinCount: 0,
    computerWinCount: 0
  },
  global: {
    playerWinCount: 0,
    computerWinCount: 0,
    movesCount: 0,
    makaoCallCount: 0
  }
};

export default function(state = initialState, action) {
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
