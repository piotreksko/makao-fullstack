import type { AppThunk } from "../rootReducer";

export interface SoundAction {
  type: string;
  meta: { sound: { play: string } };
}

export function playSound(sound: string): SoundAction {
  return {
    type: sound.toUpperCase(),
    meta: {
      sound: {
        play: sound
      }
    }
  };
}

export type SoundFactor =
  | "chosenType"
  | "chosenWeight"
  | "waitTurn"
  | "battleCardActive";

export function checkSoundsToPlay(
  factor: SoundFactor,
  value?: unknown
): AppThunk<SoundAction | undefined> {
  return dispatch => {
    if (factor === "chosenType") return dispatch(playSound("jack"));
    if (factor === "chosenWeight") return dispatch(playSound("ace"));
    if (factor === "waitTurn" && value) return dispatch(playSound("wait"));
    if (factor === "battleCardActive" && value) return dispatch(playSound("battle"));
  };
}
