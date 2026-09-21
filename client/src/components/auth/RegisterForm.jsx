import React, { useState } from "react";
import FormField from "./FormField";
import SubmitButton from "./SubmitButton";
import { validateRegister } from "../../utility/authValidation";

const RegisterForm = ({ onSubmit, loading }) => {
  const [values, setValues] = useState({
    email: "",
    displayName: "",
    password: ""
  });
  const [errors, setErrors] = useState({});

  const handleChange = e => {
    const { name, value } = e.target;
    setValues(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = e => {
    e.preventDefault();
    const found = validateRegister(values);
    setErrors(found);
    if (Object.keys(found).length === 0) {
      onSubmit(values);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FormField
        label="Email"
        name="email"
        type="email"
        value={values.email}
        error={errors.email}
        onChange={handleChange}
        autoComplete="email"
      />
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
        autoComplete="new-password"
      />
      <SubmitButton
        loading={loading}
        label="Create account"
        loadingLabel="Creating account..."
      />
    </form>
  );
};

export default RegisterForm;
