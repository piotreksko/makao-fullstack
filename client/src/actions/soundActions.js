export function playSound(sound) {
  return {
    type: sound.toUpperCase(),
    meta: {
      sound: {
        play: sound
      }
    }
  };
}

export function checkSoundsToPlay(factor, value) {
  return dispatch => {
    if (factor === "chosenType") return dispatch(playSound("jack"));
    if (factor === "chosenWeight") return dispatch(playSound("ace"));
    if (factor === "waitTurn" && value) return dispatch(playSound("wait"));
    if (factor === "battleCardActive" && value) return dispatch(playSound("battle"));
  };
}
