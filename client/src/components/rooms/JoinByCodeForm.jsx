import React, { useState } from "react";

const JoinByCodeForm = ({ onSubmit, loading }) => {
  const [inviteCode, setInviteCode] = useState("");

  const handleSubmit = e => {
    e.preventDefault();
    onSubmit(inviteCode.trim().toUpperCase());
  };

  return (
    <form onSubmit={handleSubmit} className="tw:mb-6 tw:flex tw:gap-2">
      <input
        type="text"
        placeholder="Invite code"
        value={inviteCode}
        onChange={e => setInviteCode(e.target.value)}
        maxLength={8}
        className="tw:flex-1 tw:rounded-lg tw:border tw:border-slate-300 tw:px-3 tw:py-2"
      />
      <button
        type="submit"
        disabled={loading || inviteCode.length !== 8}
        className="tw:cursor-pointer tw:rounded-md tw:border-0 tw:bg-slate-700 tw:px-4 tw:py-2 tw:text-sm tw:font-semibold tw:text-white tw:hover:bg-slate-800 tw:disabled:cursor-not-allowed tw:disabled:opacity-60"
      >
        Join by code
      </button>
    </form>
  );
};

export default JoinByCodeForm;
