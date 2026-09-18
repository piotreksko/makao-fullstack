import configureStore from "redux-mock-store"; //ES6 modules
import thunk from "redux-thunk";
import { checkSoundsToPlay } from "./soundActions";

const middlewares = [thunk];
const mockStore = configureStore(middlewares);

describe("sound actions", () => {
  const initialState = {};
  let store;
  let actions;

  it("should dispatch action", () => {
    const sound = "ACE";
    const playSound = sound => ({ type: sound.toUpperCase() });
    store = mockStore(initialState);
    store.dispatch(playSound(sound));
    actions = store.getActions();

    const expectedPayload = { type: sound };
    expect(actions).toEqual([expectedPayload]);
  });

  // describe("check sounds to play", () => {
  //   const testValues = [
  //     "chosenType",
  //     "chosenWeight",
  //     "waitTurn",
  //     "battleCardActive"
  //   ];
  //   const testSounds = ["jack", "ace", "wait", "battle"];
  //   let value = true;

  //   testValues.forEach((test, index) => {
  //     debugger;
  //     store = mockStore(initialState);
  //     store.dispatch(checkSoundsToPlay(test, value));
  //     actions = store.getActions();

  //     it("plays specific sound", () => {
  //       const expectedPayload = [{ type: testSounds[index].toUpperCase() }];
  //       const actions = store.getActions();
  //       expect(actions).toEqual(expectedPayload);
  //     });
  //   });
  // });
});
