import configureStore from "redux-mock-store";
import thunk from "redux-thunk";
import {
  addToDeck,
  newGame,
  updateGameFactor,
  updatePlayerCards,
  updateCpuCards,
  shuffleDeck,
  waitTurns
} from "./logicActions";
import {
  ADD_TO_DECK,
  NEW_GAME,
  UPDATE_GAME_FACTOR,
  UPDATE_PLAYER_CARDS,
  UPDATE_CPU_CARDS,
  UPDATE_WHOS_TURN,
  TAKE_FROM_DECK,
  ADD_TO_PILE,
  WAIT_TURNS,
  CHANGE_SUIT,
  DEMAND_CARD,
  SHUFFLE_DECK,
  RESTART_GAME
} from "./logicActions";

const middlewares = [thunk];
const mockStore = configureStore(middlewares);
const cards = [
  { type: "ace", weight: "spades" },
  { type: "5", weight: "hearts" }
];
const factor = waitTurns;
const value = false;

describe("logic actions", () => {
  const initialState = {};
  let store;
  let actions;

  beforeEach(() => {
    store = mockStore(initialState);
  });

  it("should dispatch addToDeck action", () => {
    store.dispatch(addToDeck(cards));
    actions = store.getActions();

    const expectedAction = { type: ADD_TO_DECK, cards };
    expect(actions).toEqual([expectedAction]);
  });

  it("should dispatch newGame action", () => {
    store.dispatch(newGame());
    actions = store.getActions();

    const expectedAction = { type: NEW_GAME };
    expect(actions).toEqual([expectedAction]);
  });

  it("should dispatch updateGameFactor action", () => {
    store.dispatch(updateGameFactor(factor, value));
    actions = store.getActions();

    const expectedAction = { type: UPDATE_GAME_FACTOR, factor, value };
    expect(actions).toEqual([expectedAction]);
  });

  it("should dispatch updatePlayerCards action", () => {
    store.dispatch(updatePlayerCards(cards));
    actions = store.getActions();

    const expectedAction = { type: UPDATE_PLAYER_CARDS, cards };
    expect(actions).toEqual([expectedAction]);
  });

  it("should dispatch updateCpuCards action", () => {
    store.dispatch(updateCpuCards(cards));
    actions = store.getActions();

    const expectedAction = { type: UPDATE_CPU_CARDS, cards };
    expect(actions).toEqual([expectedAction]);
  });
});
