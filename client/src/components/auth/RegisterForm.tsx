import { useState, type ChangeEvent, type FormEvent } from "react";
import FormField from "./FormField";
import SubmitButton from "./SubmitButton";
import type { RegisterPayload } from "../../services/authApi";
import { validateRegister, type FieldErrors } from "../../utility/authValidation";

interface RegisterFormProps {
  onSubmit: (values: RegisterPayload) => void;
  loading: boolean;
}

const RegisterForm = ({ onSubmit, loading }: RegisterFormProps) => {
  const [values, setValues] = useState<RegisterPayload>({
    email: "",
    displayName: "",
    password: ""
  });
  const [errors, setErrors] = useState<FieldErrors>({});

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setValues(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: FormEvent) => {
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
