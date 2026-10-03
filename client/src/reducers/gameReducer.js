import {
  GAME_STATE_UPDATED,
  GAME_EVENTS_RECEIVED,
  GAME_ACTION_FAILURE,
  GAME_CLEAR_ERROR,
  GAME_LEFT
} from "../actions/gameActions";

const initialState = {
  // The server's GameView for the logged-in player, or null outside a game
  view: null,
  // The most recent batch of GameEvents, for one-shot reactions (toasts, sounds)
  events: [],
  error: null
};

export default function(state = initialState, action) {
  switch (action.type) {
    case GAME_STATE_UPDATED:
      return { ...state, view: action.view };
    case GAME_EVENTS_RECEIVED:
      return { ...state, events: action.events };
    case GAME_ACTION_FAILURE:
      return { ...state, error: action.error };
    case GAME_CLEAR_ERROR:
      return { ...state, error: null };
    case GAME_LEFT:
      return initialState;
    default:
      return state;
  }
}
