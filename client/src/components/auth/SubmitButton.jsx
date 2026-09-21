import React from "react";

const SubmitButton = ({ loading, label, loadingLabel }) => (
  <button
    type="submit"
    disabled={loading}
    className="tw:w-full tw:cursor-pointer tw:rounded-lg tw:border-0 tw:bg-emerald-700 tw:px-4 tw:py-2.5 tw:font-semibold tw:text-white tw:transition tw:hover:bg-emerald-800 tw:disabled:cursor-not-allowed tw:disabled:opacity-60"
  >
    {loading ? loadingLabel : label}
  </button>
);

export default SubmitButton;
