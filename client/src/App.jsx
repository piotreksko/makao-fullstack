import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import './style/style.scss';
import '../node_modules/bootstrap/dist/css/bootstrap.min.css';
import './style/tailwind.css';
import Aux from './hoc/Auxilliary';
import GameView from './containers/GameView';
import AuthPage from './containers/AuthPage';
import * as authActions from './actions/authActions';

export const App = ({ user, initializing, restoreSession, logoutUser }) => {
  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  if (initializing) {
    return null;
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <Aux>
      <div className="tw:fixed tw:right-3 tw:top-2 tw:z-[1000] tw:flex tw:items-center tw:gap-3 tw:rounded-lg tw:bg-black/50 tw:px-3 tw:py-1.5 tw:text-sm tw:text-white">
        <span>{user.displayName}</span>
        <button
          type="button"
          onClick={logoutUser}
          className="tw:cursor-pointer tw:rounded-md tw:border tw:border-white/40 tw:bg-transparent tw:px-2.5 tw:py-1 tw:text-white tw:hover:bg-white/20"
        >
          Log out
        </button>
      </div>
      <GameView />
    </Aux>
  );
};

const mapStateToProps = state => ({
  user: state.auth.user,
  initializing: state.auth.initializing
});

const mapDispatchToProps = dispatch => ({
  restoreSession: () => dispatch(authActions.restoreSession()),
  logoutUser: () => dispatch(authActions.logoutUser())
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(App);
