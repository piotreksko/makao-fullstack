import {
  createStore,
  combineReducers,
  applyMiddleware,
  compose,
  type StoreEnhancer,
  type Middleware
} from "redux";
import { thunk, type ThunkAction, type ThunkDispatch } from "redux-thunk";
import soundsMiddleware from 'redux-sounds';
import game from "./reducers/gameReducer";
import stats from './reducers/statsReducer';
import auth from './reducers/authReducer';
import rooms from './reducers/roomsReducer';
import { soundsData } from './constants/soundsData';
import type { AppAction } from "./actions/types";

const rootReducer = combineReducers({
  game,
  stats,
  auth,
  rooms
});

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = ThunkDispatch<RootState, unknown, AppAction>;
export type AppThunk<R = void> = ThunkAction<R, RootState, unknown, AppAction>;

const loadedSoundsMiddleware = soundsMiddleware(soundsData);

const logger: Middleware<object, RootState> = store => {
  return next => {
    return action => {
      console.log("MiddleWare dispatching", action);
      const result = next(action);
      console.log("[MiddleWare] next state", store.getState());
      return result;
    };
  };
};

const devTools = (window as unknown as { devToolsExtension?: () => (f: unknown) => unknown })
  .devToolsExtension;

const enhancer = compose(
  applyMiddleware(thunk, logger, loadedSoundsMiddleware),
  devTools ? devTools() : (f: unknown) => f
) as StoreEnhancer<object, object>;

const store = createStore(rootReducer, undefined, enhancer);

export default store;
