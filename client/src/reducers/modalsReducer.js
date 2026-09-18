const initialState = () => {
  const initState = {
    ace: false,
    jack: false,
    macao: false,
    gameOver: false,
    whoStarts: false
  };

  return initState;
};

export default function modal(state = initialState(), action) {
  switch (action.type) {
    case "SHOW_MODAL":
      return { ...state, [action.modal]: true };
    case "HIDE_MODAL":
      return { ...state, [action.modal]: false };
    case "RESTART_MODALS":
      return initialState();
    default:
      return state;
  }
}
