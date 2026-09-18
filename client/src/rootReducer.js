import { createStore, combineReducers, applyMiddleware, compose } from "redux";
import gameState from "./reducers/gameStateReducer";
import modals from './reducers/modalsReducer';
import stats from './reducers/statsReducer';
import thunk from "redux-thunk";
import { reactReduxFirebase, getFirebase } from 'react-redux-firebase';
import soundsMiddleware from 'redux-sounds';
import { soundsData } from './constants/soundsData';
import firebase from 'firebase'

const rootReducer = combineReducers({
  gameState,
  modals,
  stats
});

const firebaseConfig  = {
  apiKey: "AIzaSyDljMfEcL0t5MUXYUBQaWoDg-gUO7vw0gk",
  authDomain: "makao-react.firebaseapp.com",
  databaseURL: "https://makao-react.firebaseio.com",
  projectId: "makao-react",
  storageBucket: "makao-react.appspot.com",
  messagingSenderId: "408694507372"
};

const middleware = [thunk.withExtraArgument(getFirebase)];

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

const store = createStore(rootReducer, compose(applyMiddleware(...middleware, logger, loadedSoundsMiddleware), reactReduxFirebase(firebase.initializeApp(firebaseConfig), { userProfile: 'users', enableLogging: false }), window.devToolsExtension ? window.devToolsExtension() : f => f));

export default store;
