import React, { useEffect } from "react";
import { connect } from "react-redux";
import * as roomActions from "../actions/roomActions";
import RoomList from "../components/rooms/RoomList";
import CreateRoomForm from "../components/rooms/CreateRoomForm";
import JoinByCodeForm from "../components/rooms/JoinByCodeForm";

export const Lobby = ({
  rooms,
  loading,
  actionLoading,
  currentRoom,
  error,
  fetchRooms,
  createRoom,
  joinRoom,
  joinByCode,
  leaveRoom
}) => {
  useEffect(() => {
    if (!currentRoom) {
      fetchRooms();
    }
  }, [currentRoom, fetchRooms]);

  if (currentRoom) {
    return (
      <div className="tw:mx-auto tw:max-w-xl tw:p-6">
        <h1 className="tw:text-2xl tw:font-bold">
          Room {currentRoom.inviteCode ? `(${currentRoom.inviteCode})` : ""}
        </h1>
        <p className="tw:text-slate-600">Status: {currentRoom.status}</p>
        <ul className="tw:list-none tw:p-0">
          {currentRoom.players.map(player => (
            <li key={player.seat}>
              Seat {player.seat}:{" "}
              {player.isBot ? "Bot" : player.user?.displayName ?? "Empty"}
            </li>
          ))}
        </ul>
        <p className="tw:text-sm tw:text-slate-500">
          The table itself isn't wired up yet &mdash; this is a placeholder
          until the game socket is connected.
        </p>
        <button
          type="button"
          onClick={() => leaveRoom(currentRoom.id)}
          disabled={actionLoading}
          className="tw:cursor-pointer tw:rounded-md tw:border-0 tw:bg-red-700 tw:px-4 tw:py-2 tw:font-semibold tw:text-white tw:hover:bg-red-800 tw:disabled:cursor-not-allowed tw:disabled:opacity-60"
        >
          Leave room
        </button>
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
  error: state.rooms.error
});

const mapDispatchToProps = dispatch => ({
  fetchRooms: () => dispatch(roomActions.fetchRooms()),
  createRoom: payload => dispatch(roomActions.createRoom(payload)),
  joinRoom: (id, inviteCode) => dispatch(roomActions.joinRoom(id, inviteCode)),
  joinByCode: inviteCode => dispatch(roomActions.joinByCode(inviteCode)),
  leaveRoom: id => dispatch(roomActions.leaveRoom(id))
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Lobby);
