import { emit, type SocketError } from "../services/socket";
import { playSound } from "./soundActions";
import type { AppThunk } from "../rootReducer";
import type { Card, GameEvent, GameView, PlayChoice } from "../types";

export const GAME_STATE_UPDATED = "GAME_STATE_UPDATED";
export const GAME_EVENTS_RECEIVED = "GAME_EVENTS_RECEIVED";
export const GAME_ACTION_FAILURE = "GAME_ACTION_FAILURE";
export const GAME_CLEAR_ERROR = "GAME_CLEAR_ERROR";
export const GAME_LEFT = "GAME_LEFT";

export type GameAction =
  | { type: typeof GAME_STATE_UPDATED; view: GameView }
  | { type: typeof GAME_EVENTS_RECEIVED; events: GameEvent[] }
  | { type: typeof GAME_ACTION_FAILURE; error: string }
  | { type: typeof GAME_CLEAR_ERROR }
  | { type: typeof GAME_LEFT };

export const gameStateUpdated = (view: GameView): GameAction => ({
  type: GAME_STATE_UPDATED,
  view
});

export const gameEventsReceived =
  (events: GameEvent[]): AppThunk =>
  (dispatch, getState) => {
    dispatch({ type: GAME_EVENTS_RECEIVED, events });
    events.forEach(event => {
      switch (event.type) {
        case "played":
          dispatch(playSound("pick_card1"));
          break;
        case "drew":
          dispatch(playSound("take_card"));
          break;
        case "reshuffled":
          dispatch(playSound("shuffle"));
          break;
        case "waited":
          dispatch(playSound("wait"));
          break;
        case "gameOver": {
          // game:state arrives before game:events on the same socket, so the
          // view already reflects the final ranking by the time this runs
          const view = getState().game.view;
          const won = view?.you && event.ranking[0] === view.you.seat;
          dispatch(playSound(won ? "victory" : "defeat"));
          break;
        }
        default:
          break;
      }
    });
  };

export const gameLeft = (): GameAction => ({ type: GAME_LEFT });
export const clearGameError = (): GameAction => ({ type: GAME_CLEAR_ERROR });

// The server's own message, already written for display
const socketErrorMessage = (err: unknown) =>
  (err as SocketError).serverMessage || "That move isn't allowed right now.";

const runMove =
  (request: () => Promise<{ game?: GameView }>): AppThunk<Promise<void>> =>
  async dispatch => {
    try {
      const { game } = await request();
      if (game) dispatch(gameStateUpdated(game));
    } catch (err) {
      dispatch({ type: GAME_ACTION_FAILURE, error: socketErrorMessage(err) });
    }
  };

export const playCards = (cards: Card[], choice: PlayChoice = {}) =>
  runMove(() => emit("game:playCards", { cards, ...choice }));

export const drawCard = () => runMove(() => emit("game:drawCard"));

export const keepCard = () => runMove(() => emit("game:keepCard"));

export const waitTurn = () => runMove(() => emit("game:wait"));
