import { createStore, combineReducers, applyMiddleware, compose } from "redux";
import gameState from "./reducers/gameStateReducer";
import modals from './reducers/modalsReducer';
import stats from './reducers/statsReducer';
import thunk from "redux-thunk";
import soundsMiddleware from 'redux-sounds';
import { soundsData } from './constants/soundsData';

const rootReducer = combineReducers({
  gameState,
  modals,
  stats
});

const middleware = [thunk];

const loadedSoundsMiddleware = soundsMiddleware(soundsData);

const logger = store => {
  return next => {
    return action => {
      console.log("MiddleWare dispatching", action);
      const result = next(action);
      console.log("[MiddleWare] next state", store.getState());
      return result;
    };
  };
};

const store = createStore(rootReducer, compose(applyMiddleware(...middleware, logger, loadedSoundsMiddleware), window.devToolsExtension ? window.devToolsExtension() : f => f));

export default store;
