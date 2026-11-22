import configureStore from "redux-mock-store";
import { thunk } from "redux-thunk";
import { checkSoundsToPlay, playSound } from "./soundActions";

const mockStore = configureStore([thunk]);

describe("sound actions", () => {
  it("playSound builds an action carrying the sound name", () => {
    expect(playSound("ace")).toEqual({
      type: "ACE",
      meta: { sound: { play: "ace" } }
    });
  });

  describe("checkSoundsToPlay", () => {
    const dispatched = (factor, value) => {
      const store = mockStore({});
      store.dispatch(checkSoundsToPlay(factor, value));
      return store.getActions().map(action => action.type);
    };

    it("plays the jack sound for a chosen type", () => {
      expect(dispatched("chosenType")).toEqual(["JACK"]);
    });

    it("plays the ace sound for a chosen weight", () => {
      expect(dispatched("chosenWeight")).toEqual(["ACE"]);
    });

    it("plays the wait sound only when a wait is active", () => {
      expect(dispatched("waitTurn", 2)).toEqual(["WAIT"]);
      expect(dispatched("waitTurn", 0)).toEqual([]);
    });

    it("plays the battle sound only when a battle is active", () => {
      expect(dispatched("battleCardActive", true)).toEqual(["BATTLE"]);
      expect(dispatched("battleCardActive", false)).toEqual([]);
    });
  });
});
