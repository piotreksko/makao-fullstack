import React from "react";

const FormField = ({
  label,
  name,
  type = "text",
  value,
  error,
  onChange,
  autoComplete
}) => (
  <div className="tw:mb-5">
    <label
      htmlFor={name}
      className="tw:mb-1.5 tw:block tw:text-sm tw:font-medium tw:text-slate-700"
    >
      {label}
    </label>
    <input
      id={name}
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      autoComplete={autoComplete}
      className={`tw:block tw:w-full tw:rounded-lg tw:border tw:bg-white tw:px-3 tw:py-2 tw:text-slate-900 tw:shadow-sm tw:outline-none tw:focus:ring-2 ${
        error
          ? "tw:border-red-500 tw:focus:ring-red-500/30"
          : "tw:border-slate-300 tw:focus:border-emerald-600 tw:focus:ring-emerald-600/30"
      }`}
    />
    {error && <p className="tw:mt-1 tw:mb-0 tw:text-sm tw:text-red-600">{error}</p>}
  </div>
);

export default FormField;
