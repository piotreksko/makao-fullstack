import {
  listRooms as listRoomsApi,
  createRoom as createRoomApi,
  joinRoom as joinRoomApi,
  joinByCode as joinByCodeApi,
  leaveRoom as leaveRoomApi
} from "../services/roomsApi";

export const ROOMS_LIST_REQUEST = "ROOMS_LIST_REQUEST";
export const ROOMS_LIST_SUCCESS = "ROOMS_LIST_SUCCESS";
export const ROOMS_LIST_FAILURE = "ROOMS_LIST_FAILURE";
export const ROOM_ACTION_REQUEST = "ROOM_ACTION_REQUEST";
export const ROOM_ACTION_SUCCESS = "ROOM_ACTION_SUCCESS";
export const ROOM_ACTION_FAILURE = "ROOM_ACTION_FAILURE";
export const ROOM_LEFT = "ROOM_LEFT";
export const ROOMS_CLEAR_ERROR = "ROOMS_CLEAR_ERROR";

const roomsErrorMessage = err => {
  switch (err.status) {
    case 400:
      return Array.isArray(err.body && err.body.message)
        ? err.body.message.join(". ")
        : "Please check the entered data.";
    case 404:
      return "That room no longer exists.";
    case 409:
      return (err.body && err.body.message) || "That action isn't possible right now.";
    case undefined:
      return "Could not reach the server. Please try again.";
    default:
      return "Something went wrong. Please try again.";
  }
};

export const fetchRooms = () => async dispatch => {
  dispatch({ type: ROOMS_LIST_REQUEST });
  try {
    const rooms = await listRoomsApi();
    dispatch({ type: ROOMS_LIST_SUCCESS, rooms });
  } catch (err) {
    dispatch({ type: ROOMS_LIST_FAILURE, error: roomsErrorMessage(err) });
  }
};

const runRoomAction = request => async dispatch => {
  dispatch({ type: ROOM_ACTION_REQUEST });
  try {
    const room = await request();
    dispatch({ type: ROOM_ACTION_SUCCESS, room });
  } catch (err) {
    dispatch({ type: ROOM_ACTION_FAILURE, error: roomsErrorMessage(err) });
  }
};

export const createRoom = payload =>
  runRoomAction(() => createRoomApi(payload));

export const joinRoom = (id, inviteCode) =>
  runRoomAction(() => joinRoomApi(id, inviteCode));

export const joinByCode = inviteCode =>
  runRoomAction(() => joinByCodeApi(inviteCode));

export const leaveRoom = id => async dispatch => {
  dispatch({ type: ROOM_ACTION_REQUEST });
  try {
    await leaveRoomApi(id);
    dispatch({ type: ROOM_LEFT });
  } catch (err) {
    dispatch({ type: ROOM_ACTION_FAILURE, error: roomsErrorMessage(err) });
  }
};

export const clearRoomsError = () => ({ type: ROOMS_CLEAR_ERROR });
