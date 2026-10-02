import React, { useState } from "react";

const MAX_PLAYERS = 4;

const CreateRoomForm = ({ onSubmit, loading }) => {
  const [visibility, setVisibility] = useState("public");
  const [bots, setBots] = useState(0);

  const handleSubmit = e => {
    e.preventDefault();
    onSubmit({
      visibility,
      maxPlayers: MAX_PLAYERS,
      bots: Number(bots)
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="tw:rounded-lg tw:border tw:border-slate-200 tw:p-4"
    >
      <h2 className="tw:mb-3 tw:mt-0 tw:text-base tw:font-semibold">
        Create a room
      </h2>

      <label className="tw:mb-3 tw:block tw:text-sm">
        Visibility
        <select
          value={visibility}
          onChange={e => setVisibility(e.target.value)}
          className="tw:mt-1 tw:block tw:w-full tw:rounded-lg tw:border tw:border-slate-300 tw:px-3 tw:py-2"
        >
          <option value="public">Public</option>
          <option value="private">Private</option>
        </select>
      </label>

      <label className="tw:mb-4 tw:block tw:text-sm">
        Bots
        <input
          type="number"
          min={0}
          max={MAX_PLAYERS - 1}
          value={bots}
          onChange={e => setBots(e.target.value)}
          className="tw:mt-1 tw:block tw:w-full tw:rounded-lg tw:border tw:border-slate-300 tw:px-3 tw:py-2"
        />
      </label>

      <button
        type="submit"
        disabled={loading}
        className="tw:w-full tw:cursor-pointer tw:rounded-lg tw:border-0 tw:bg-emerald-700 tw:px-4 tw:py-2.5 tw:font-semibold tw:text-white tw:hover:bg-emerald-800 tw:disabled:cursor-not-allowed tw:disabled:opacity-60"
      >
        {loading ? "Creating..." : "Create room"}
      </button>
    </form>
  );
};

export default CreateRoomForm;
