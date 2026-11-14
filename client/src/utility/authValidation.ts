// Mirrors the server's RegisterDto / LoginDto rules (server/src/auth/auth.dto.ts)
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DISPLAY_NAME_PATTERN = /^[a-zA-Z0-9_]+$/;

export interface FieldErrors {
  email?: string;
  displayName?: string;
  password?: string;
}

export const validateLogin = ({
  displayName,
  password
}: {
  displayName: string;
  password: string;
}): FieldErrors => {
  const errors: FieldErrors = {};
  if (!displayName) {
    errors.displayName = "Display name is required.";
  }
  if (!password) {
    errors.password = "Password is required.";
  }
  return errors;
};

export const validateRegister = ({
  email,
  displayName,
  password
}: {
  email: string;
  displayName: string;
  password: string;
}): FieldErrors => {
  const errors: FieldErrors = {};

  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    errors.email = "Enter a valid email address.";
  }

  if (displayName.length < 3 || displayName.length > 20) {
    errors.displayName = "Display name must be 3-20 characters long.";
  } else if (!DISPLAY_NAME_PATTERN.test(displayName)) {
    errors.displayName =
      "Display name may only contain letters, numbers and underscores.";
  }

  if (password.length < 8 || password.length > 72) {
    errors.password = "Password must be 8-72 characters long.";
  }

  return errors;
};
