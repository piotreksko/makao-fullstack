import React, { useState } from "react";
import { connect } from "react-redux";
import * as authActions from "../actions/authActions";
import LoginForm from "../components/auth/LoginForm";
import RegisterForm from "../components/auth/RegisterForm";

export const AuthPage = ({
  loading,
  error,
  loginUser,
  registerUser,
  clearAuthError
}) => {
  const [mode, setMode] = useState("login");
  const isLogin = mode === "login";

  const switchMode = () => {
    clearAuthError();
    setMode(isLogin ? "register" : "login");
  };

  return (
    <div className="tw:flex tw:min-h-screen tw:items-start tw:justify-center tw:px-4 tw:pt-[10vh]">
      <div className="tw:w-full tw:max-w-md tw:rounded-2xl tw:bg-white/95 tw:p-8 tw:text-slate-800 tw:shadow-2xl">
        <h1 className="tw:mb-6 tw:mt-0 tw:text-center tw:text-2xl tw:font-bold">
          {isLogin ? "Log in to Makao" : "Create an account"}
        </h1>
        {error && (
          <div
            role="alert"
            className="tw:mb-5 tw:rounded-lg tw:border tw:border-red-200 tw:bg-red-50 tw:px-4 tw:py-3 tw:text-sm tw:text-red-700"
          >
            {error}
          </div>
        )}
        {isLogin ? (
          <LoginForm onSubmit={loginUser} loading={loading} />
        ) : (
          <RegisterForm onSubmit={registerUser} loading={loading} />
        )}
        <button
          type="button"
          onClick={switchMode}
          className="tw:mt-5 tw:w-full tw:cursor-pointer tw:border-0 tw:bg-transparent tw:text-sm tw:text-emerald-800 tw:hover:underline"
        >
          {isLogin
            ? "No account yet? Register"
            : "Already have an account? Log in"}
        </button>
      </div>
    </div>
  );
};

const mapStateToProps = state => ({
  loading: state.auth.loading,
  error: state.auth.error
});

const mapDispatchToProps = dispatch => ({
  loginUser: payload => dispatch(authActions.loginUser(payload)),
  registerUser: payload => dispatch(authActions.registerUser(payload)),
  clearAuthError: () => dispatch(authActions.clearAuthError())
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(AuthPage);
