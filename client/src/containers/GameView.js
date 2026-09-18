import React, { Component } from "react";
import { connect } from "react-redux";
import * as logicActions from "../actions/logicActions";
import * as soundActions from "../actions/soundActions";
import Aux from "../hoc/Auxilliary";
import Modals from "./Modals";
import Header from "./Header";
import Player from "./Player";
import Icons from "./Icons";
import Deck from "../components/Deck";
import Pile from "../components/Pile";
import Confetti from "react-dom-confetti";
import CpuPlayer from "../components/CpuPlayer";

export class GameView extends Component {
  constructor(props) {
    super(props);
    this.state = {
      canTakeCard: true
    };
    this.takeCards = this.takeCards.bind(this);
    this.restartGame = this.restartGame.bind(this);
  }

  componentWillMount() {
    setTimeout(() => {
      this.props.showModal("whoStarts");
    }, 1);
    setTimeout(() => {
      this.props.hideModal("whoStarts");
    }, 1000);
  }

  componentDidUpdate(prevProps) {
    if (!prevProps.gameState.isPlayerTurn && this.props.gameState.isPlayerTurn) {
      this.setState({ canTakeCard: true });
    }
  }

  takeCards() {
    const { gameState, takeCards, makePlayerMove } = this.props;
    const { firstCardChecked, cardsToTake } = gameState;

    if (this.state.canTakeCard) {
      this.setState({ canTakeCard: false });
      if (firstCardChecked) makePlayerMove();
      else takeCards(cardsToTake);

      if (firstCardChecked) {
        setTimeout(() => {
          this.props.endTurn();
        }, 1000);
      }
      if (cardsToTake > 1 && !firstCardChecked)
        this.setState({ canTakeCard: true });
    }
  }

  restartGame() {
    this.props.playSound("click");
    this.props.restartGame();

    this.props.hideModal("gameOver");
    setTimeout(() => {
      this.props.showModal("whoStarts");
    }, 1);
    setTimeout(() => {
      this.props.hideModal("whoStarts");
    }, 1000);
  }

  render() {
    const gameState = this.props.gameState,
      playerCanMove =
        !gameState.player.wait && !gameState.waitTurn ? true : false,
      { pile } = gameState;

    const confettiConfig = {
      angle: 90,
      spread: 80,
      startVelocity: 50,
      elementCount: 30,
      decay: 0.9
    };

    return (
      <Aux>
        <Modals restartGame={this.restartGame} />
        <div className="confetti">
          <Confetti
            active={!this.props.gameState.player.cards.length}
            config={confettiConfig}
          />
        </div>
        <Header restartGame={this.restartGame} />
        <CpuPlayer cpuPlayer={gameState.cpuPlayer} />
        <div className="flex-container middle cards-container">
          <Deck
            takeCard={this.takeCards}
            playerCanMove={playerCanMove}
            cardsInDeck={gameState.deck.length}
            cardsToTake={gameState.cardsToTake}
            isPlayerTurn={gameState.isPlayerTurn}
            firstCardChecked={gameState.firstCardChecked}
          />
          <Pile cards={pile} />
          <Icons />
        </div>
        <Player />
      </Aux>
    );
  }
}

const mapStateToProps = state => {
  return {
    stats: state.stats,
    modals: state.modals,
    gameState: state.gameState
  };
};

const mapDispatchToProps = dispatch => {
  return {
    showModal: modal => dispatch({ type: "SHOW_MODAL", modal: modal }),
    hideModal: modal => dispatch({ type: "HIDE_MODAL", modal: modal }),
    makePlayerMove: () => dispatch(logicActions.makePlayerMove([])),
    takeCards: () => dispatch(logicActions.takeCards("player")),
    updateGameFactor: (factor, value) =>
      dispatch(logicActions.updateGameFactor(factor, value)),
    endTurn: () => {
      dispatch(logicActions.updateGameFactor("playerTurn", false));
      dispatch(logicActions.makeCpuMove());
      dispatch(logicActions.checkMacaoAndWin());
    },
    restartGame: () => dispatch(logicActions.restartGame()),
    playSound: soundName => dispatch(soundActions.playSound(soundName))
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(GameView);
