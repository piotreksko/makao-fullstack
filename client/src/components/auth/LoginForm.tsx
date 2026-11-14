import { useState, type ChangeEvent, type FormEvent } from "react";
import FormField from "./FormField";
import SubmitButton from "./SubmitButton";
import type { Credentials } from "../../services/authApi";
import { validateLogin, type FieldErrors } from "../../utility/authValidation";

interface LoginFormProps {
  onSubmit: (values: Credentials) => void;
  loading: boolean;
}

const LoginForm = ({ onSubmit, loading }: LoginFormProps) => {
  const [values, setValues] = useState<Credentials>({ displayName: "", password: "" });
  const [errors, setErrors] = useState<FieldErrors>({});

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setValues(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: FormEvent) => {
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
