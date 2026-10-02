const RoomList = ({ rooms, onJoin, loading }) => {
  if (rooms.length === 0) {
    return (
      <p className="tw:text-sm tw:text-slate-500">
        No public rooms right now. Create one below.
      </p>
    );
  }

  return (
    <ul className="tw:mb-6 tw:list-none tw:p-0">
      {rooms.map(room => (
        <li
          key={room.id}
          className="tw:mb-2 tw:flex tw:items-center tw:justify-between tw:rounded-lg tw:border tw:border-slate-200 tw:px-4 tw:py-2.5"
        >
          <span>
            {room.host.displayName}'s room ({room.players.length}/
            {room.maxPlayers})
          </span>
          <button
            type="button"
            disabled={loading}
            onClick={() => onJoin(room.id)}
            className="tw:cursor-pointer tw:rounded-md tw:border-0 tw:bg-emerald-700 tw:px-3 tw:py-1.5 tw:text-sm tw:font-semibold tw:text-white tw:hover:bg-emerald-800 tw:disabled:cursor-not-allowed tw:disabled:opacity-60"
          >
            Join
          </button>
        </li>
      ))}
    </ul>
  );
};

export default RoomList;
