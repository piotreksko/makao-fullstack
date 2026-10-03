import { emit } from "../services/socket";
import { playSound } from "./soundActions";

export const GAME_STATE_UPDATED = "GAME_STATE_UPDATED";
export const GAME_EVENTS_RECEIVED = "GAME_EVENTS_RECEIVED";
export const GAME_ACTION_FAILURE = "GAME_ACTION_FAILURE";
export const GAME_CLEAR_ERROR = "GAME_CLEAR_ERROR";
export const GAME_LEFT = "GAME_LEFT";

export const gameStateUpdated = view => ({ type: GAME_STATE_UPDATED, view });

export const gameEventsReceived = events => (dispatch, getState) => {
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

export const gameLeft = () => ({ type: GAME_LEFT });
export const clearGameError = () => ({ type: GAME_CLEAR_ERROR });

// The server's own message, already written for display
const socketErrorMessage = err =>
  err.serverMessage || "That move isn't allowed right now.";

const runMove = request => async dispatch => {
  try {
    const { game } = await request();
    if (game) dispatch(gameStateUpdated(game));
  } catch (err) {
    dispatch({ type: GAME_ACTION_FAILURE, error: socketErrorMessage(err) });
  }
};

// cards: {rank, suit}[]; choice: {suit?, demand?}
export const playCards = (cards, choice = {}) =>
  runMove(() => emit("game:playCards", { cards, ...choice }));

export const drawCard = () => runMove(() => emit("game:drawCard"));

export const keepCard = () => runMove(() => emit("game:keepCard"));

export const waitTurn = () => runMove(() => emit("game:wait"));
