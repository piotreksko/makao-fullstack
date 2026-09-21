import React, { useState } from "react";
import FormField from "./FormField";
import SubmitButton from "./SubmitButton";
import { validateLogin } from "../../utility/authValidation";

const LoginForm = ({ onSubmit, loading }) => {
  const [values, setValues] = useState({ displayName: "", password: "" });
  const [errors, setErrors] = useState({});

  const handleChange = e => {
    const { name, value } = e.target;
    setValues(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = e => {
    e.preventDefault();
    const found = validateLogin(values);
    setErrors(found);
    if (Object.keys(found).length === 0) {
      onSubmit(values);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FormField
        label="Display name"
        name="displayName"
        value={values.displayName}
        error={errors.displayName}
        onChange={handleChange}
        autoComplete="username"
      />
      <FormField
        label="Password"
        name="password"
        type="password"
        value={values.password}
        error={errors.password}
        onChange={handleChange}
        autoComplete="current-password"
      />
      <SubmitButton
        loading={loading}
        label="Log in"
        loadingLabel="Logging in..."
      />
    </form>
  );
};

export default LoginForm;
