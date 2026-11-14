import type { StoreAction } from "../actions/types";
import type { GameEvent, GameView } from "../types";
import {
  GAME_STATE_UPDATED,
  GAME_EVENTS_RECEIVED,
  GAME_ACTION_FAILURE,
  GAME_CLEAR_ERROR,
  GAME_LEFT
} from "../actions/gameActions";

export interface GameState {
  view: GameView | null;
  events: GameEvent[];
  error: string | null;
}

const initialState: GameState = {
  // The server's GameView for the logged-in player, or null outside a game
  view: null,
  // The most recent batch of GameEvents, for one-shot reactions (toasts, sounds)
  events: [],
  error: null
};

export default function gameReducer(
  state: GameState = initialState,
  action: StoreAction
): GameState {
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
