import {
  listRooms as listRoomsApi,
  createRoom as createRoomApi,
  joinRoom as joinRoomApi,
  joinByCode as joinByCodeApi,
  leaveRoom as leaveRoomApi,
  getMyRoom as getMyRoomApi
} from "../services/roomsApi";
import { emit } from "../services/socket";
import { gameStateUpdated } from "./gameActions";

export const ROOMS_LIST_REQUEST = "ROOMS_LIST_REQUEST";
export const ROOMS_LIST_SUCCESS = "ROOMS_LIST_SUCCESS";
export const ROOMS_LIST_FAILURE = "ROOMS_LIST_FAILURE";
export const ROOM_ACTION_REQUEST = "ROOM_ACTION_REQUEST";
export const ROOM_ACTION_SUCCESS = "ROOM_ACTION_SUCCESS";
export const ROOM_ACTION_FAILURE = "ROOM_ACTION_FAILURE";
export const ROOM_STATE_UPDATED = "ROOM_STATE_UPDATED";
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

// Socket acks carry a message already meant for display, unlike the REST
// client's HttpException bodies above
const socketErrorMessage = err =>
  err.serverMessage || "Could not reach the server. Please try again.";

export const fetchRooms = () => async dispatch => {
  dispatch({ type: ROOMS_LIST_REQUEST });
  try {
    const rooms = await listRoomsApi();
    dispatch({ type: ROOMS_LIST_SUCCESS, rooms });
  } catch (err) {
    dispatch({ type: ROOMS_LIST_FAILURE, error: roomsErrorMessage(err) });
  }
};

// Puts back a room the user is still seated in (e.g. after a page reload), so
// they can rejoin or leave it instead of being blocked from every other room
export const fetchMyRoom = () => async dispatch => {
  try {
    const room = await getMyRoomApi();
    if (room) dispatch({ type: ROOM_ACTION_SUCCESS, room });
  } catch (err) {
    dispatch({ type: ROOM_ACTION_FAILURE, error: roomsErrorMessage(err) });
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

export const roomStateUpdated = room => ({ type: ROOM_STATE_UPDATED, room });

// Seats you in the room's Socket.IO channel; without this you're a member in
// the database but won't receive any room:state/chat/ready pushes for it
export const joinRoomChannel = roomId => async dispatch => {
  try {
    const { room, game } = await emit("room:join", { roomId });
    dispatch(roomStateUpdated(room));
    if (game) dispatch(gameStateUpdated(game));
  } catch (err) {
    dispatch({ type: ROOM_ACTION_FAILURE, error: socketErrorMessage(err) });
  }
};

export const toggleReady = () => async dispatch => {
  try {
    await emit("room:toggleReady");
  } catch (err) {
    dispatch({ type: ROOM_ACTION_FAILURE, error: socketErrorMessage(err) });
  }
};

export const startGame = () => async dispatch => {
  try {
    const { game } = await emit("game:start");
    if (game) dispatch(gameStateUpdated(game));
  } catch (err) {
    dispatch({ type: ROOM_ACTION_FAILURE, error: socketErrorMessage(err) });
  }
};

export const clearRoomsError = () => ({ type: ROOMS_CLEAR_ERROR });
