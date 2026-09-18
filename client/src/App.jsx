import React, { Component } from 'react';
import './style/style.scss';
import '../node_modules/bootstrap/dist/css/bootstrap.min.css';
import Aux from './hoc/Auxilliary';
import GameView from './containers/GameView';
class App extends Component {
  render() {
    return (
      <Aux>
        <GameView />
      </Aux>
    );
  }
}

export default App;
