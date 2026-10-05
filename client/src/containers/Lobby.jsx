import React, { useEffect } from "react";
import { connect } from "react-redux";
import * as roomActions from "../actions/roomActions";
import { gameStateUpdated, gameEventsReceived, gameLeft } from "../actions/gameActions";
import { on } from "../services/socket";
import RoomList from "../components/rooms/RoomList";
import CreateRoomForm from "../components/rooms/CreateRoomForm";
import JoinByCodeForm from "../components/rooms/JoinByCodeForm";
import GameView from "./GameView";

// Mirrors the server's RoomStatus enum (server/src/rooms/rooms.types.ts)
const ROOM_STATUS_IN_PROGRESS = "in_progress";

export const Lobby = ({
  rooms,
  loading,
  actionLoading,
  currentRoom,
  gameView,
  userId,
  error,
  fetchRooms,
  fetchMyRoom,
  createRoom,
  joinRoom,
  joinByCode,
  leaveRoom,
  joinRoomChannel,
  roomStateUpdated,
  toggleReady,
  startGame,
  gameStateUpdated,
  gameEventsReceived,
  gameLeft
}) => {
  useEffect(() => {
    if (!currentRoom) {
      fetchRooms();
      fetchMyRoom();
    }
  }, [currentRoom, fetchRooms, fetchMyRoom]);

  // Entering the room's Socket.IO channel is separate from being seated in
  // it (REST); room:state pushes only reach sockets that have joined
  useEffect(() => {
    if (!currentRoom) return undefined;
    joinRoomChannel(currentRoom.id);
    return on("room:state", roomStateUpdated);
  }, [currentRoom?.id, joinRoomChannel, roomStateUpdated]);

  // game:state/game:events reach every socket of a seated player (pushed to
  // their user channel), independent of which screen is on display, so this
  // subscribes for the whole session rather than only while GameView is shown
  useEffect(() => {
    const offState = on("game:state", gameStateUpdated);
    const offEvents = on("game:events", gameEventsReceived);
    return () => {
      offState();
      offEvents();
    };
  }, [gameStateUpdated, gameEventsReceived]);

  const leaveGame = () => {
    gameLeft();
    if (currentRoom) leaveRoom(currentRoom.id);
  };

  if (currentRoom) {
    const isGameLive =
      currentRoom.status === ROOM_STATUS_IN_PROGRESS ||
      gameView?.status === "finished";

    if (isGameLive && gameView) {
      return <GameView currentRoom={currentRoom} onLeave={leaveGame} />;
    }

    const me = currentRoom.players.find(p => p.user?.id === userId);
    const isHost = currentRoom.host.id === userId;

    return (
      <div className="tw:mx-auto tw:max-w-xl tw:p-6">
        {error && (
          <div
            role="alert"
            className="tw:mb-5 tw:rounded-lg tw:border tw:border-red-200 tw:bg-red-50 tw:px-4 tw:py-3 tw:text-sm tw:text-red-700"
          >
            {error}
          </div>
        )}
        <h1 className="tw:text-2xl tw:font-bold">
          Room {currentRoom.inviteCode ? `(${currentRoom.inviteCode})` : ""}
        </h1>
        <p className="tw:text-slate-600">Status: {currentRoom.status}</p>
        <ul className="tw:list-none tw:p-0">
          {currentRoom.players.map(player => (
            <li key={player.seat}>
              Seat {player.seat}:{" "}
              {player.isBot ? "Bot" : player.user?.displayName ?? "Empty"}
              {!player.isBot && (player.isReady ? " (ready)" : " (not ready)")}
            </li>
          ))}
        </ul>
        {isGameLive && (
          <p className="tw:text-sm tw:text-slate-500">Starting game...</p>
        )}
        <div className="tw:flex tw:gap-2">
          {me && (
            <button
              type="button"
              onClick={toggleReady}
              disabled={actionLoading}
              className="tw:cursor-pointer tw:rounded-md tw:border-0 tw:bg-emerald-700 tw:px-4 tw:py-2 tw:font-semibold tw:text-white tw:hover:bg-emerald-800 tw:disabled:cursor-not-allowed tw:disabled:opacity-60"
            >
              {me.isReady ? "Not ready" : "Ready up"}
            </button>
          )}
          {isHost && (
            <button
              type="button"
              onClick={startGame}
              disabled={actionLoading}
              className="tw:cursor-pointer tw:rounded-md tw:border-0 tw:bg-slate-700 tw:px-4 tw:py-2 tw:font-semibold tw:text-white tw:hover:bg-slate-800 tw:disabled:cursor-not-allowed tw:disabled:opacity-60"
            >
              Start game
            </button>
          )}
          <button
            type="button"
            onClick={() => leaveRoom(currentRoom.id)}
            disabled={actionLoading}
            className="tw:cursor-pointer tw:rounded-md tw:border-0 tw:bg-red-700 tw:px-4 tw:py-2 tw:font-semibold tw:text-white tw:hover:bg-red-800 tw:disabled:cursor-not-allowed tw:disabled:opacity-60"
          >
            Leave room
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="tw:mx-auto tw:max-w-xl tw:p-6">
      <h1 className="tw:text-2xl tw:font-bold">Lobby</h1>

      {error && (
        <div
          role="alert"
          className="tw:mb-5 tw:rounded-lg tw:border tw:border-red-200 tw:bg-red-50 tw:px-4 tw:py-3 tw:text-sm tw:text-red-700"
        >
          {error}
        </div>
      )}

      <JoinByCodeForm onSubmit={joinByCode} loading={actionLoading} />

      {loading ? (
        <p className="tw:text-sm tw:text-slate-500">Loading rooms...</p>
      ) : (
        <RoomList
          rooms={rooms}
          onJoin={id => joinRoom(id)}
          loading={actionLoading}
        />
      )}

      <CreateRoomForm onSubmit={createRoom} loading={actionLoading} />
    </div>
  );
};

const mapStateToProps = state => ({
  rooms: state.rooms.rooms,
  loading: state.rooms.loading,
  actionLoading: state.rooms.actionLoading,
  currentRoom: state.rooms.currentRoom,
  gameView: state.game.view,
  userId: state.auth.user?.id,
  error: state.rooms.error
});

const mapDispatchToProps = dispatch => ({
  fetchRooms: () => dispatch(roomActions.fetchRooms()),
  fetchMyRoom: () => dispatch(roomActions.fetchMyRoom()),
  createRoom: payload => dispatch(roomActions.createRoom(payload)),
  joinRoom: (id, inviteCode) => dispatch(roomActions.joinRoom(id, inviteCode)),
  joinByCode: inviteCode => dispatch(roomActions.joinByCode(inviteCode)),
  leaveRoom: id => dispatch(roomActions.leaveRoom(id)),
  joinRoomChannel: roomId => dispatch(roomActions.joinRoomChannel(roomId)),
  roomStateUpdated: room => dispatch(roomActions.roomStateUpdated(room)),
  toggleReady: () => dispatch(roomActions.toggleReady()),
  startGame: () => dispatch(roomActions.startGame()),
  gameStateUpdated: view => dispatch(gameStateUpdated(view)),
  gameEventsReceived: events => dispatch(gameEventsReceived(events)),
  gameLeft: () => dispatch(gameLeft())
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Lobby);
