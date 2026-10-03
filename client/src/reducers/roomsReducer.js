import {
  ROOMS_LIST_REQUEST,
  ROOMS_LIST_SUCCESS,
  ROOMS_LIST_FAILURE,
  ROOM_ACTION_REQUEST,
  ROOM_ACTION_SUCCESS,
  ROOM_ACTION_FAILURE,
  ROOM_STATE_UPDATED,
  ROOM_LEFT,
  ROOMS_CLEAR_ERROR
} from "../actions/roomActions";

const initialState = {
  rooms: [],
  loading: false,
  actionLoading: false,
  currentRoom: null,
  error: null
};

export default function(state = initialState, action) {
  switch (action.type) {
    case ROOMS_LIST_REQUEST:
      return { ...state, loading: true, error: null };
    case ROOMS_LIST_SUCCESS:
      return { ...state, loading: false, rooms: action.rooms };
    case ROOMS_LIST_FAILURE:
      return { ...state, loading: false, error: action.error };
    case ROOM_ACTION_REQUEST:
      return { ...state, actionLoading: true, error: null };
    case ROOM_ACTION_SUCCESS:
      return { ...state, actionLoading: false, currentRoom: action.room };
    case ROOM_ACTION_FAILURE:
      return { ...state, actionLoading: false, error: action.error };
    case ROOM_STATE_UPDATED:
      return { ...state, currentRoom: action.room };
    case ROOM_LEFT:
      return { ...state, actionLoading: false, currentRoom: null };
    case ROOMS_CLEAR_ERROR:
      return { ...state, error: null };
    default:
      return state;
  }
}
