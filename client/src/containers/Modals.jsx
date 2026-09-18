import React, { Component } from "react";
import { connect } from "react-redux";
import * as logicActions from "../actions/logicActions";
import * as soundActions from "../actions/soundActions";
import ReactModal from "react-modal";
import Aux from "../hoc/Auxilliary";
import ChangeSuitModal from "../components/modals/ChangeSuitModal";
import DemandCardModal from "../components/modals/DemandCardModal";
import GameOverModal from "../components/modals/GameOverModal";
import MacaoModal from "../components/modals/MacaoModal";
import WhoStartsModal from "../components/modals/WhoStartsModal";
import _ from 'lodash';

export class Modals extends Component {
  
  shouldComponentUpdate(nextProps, nextState) {
    const modalsChanged = !_.isEqual(nextProps.modals, this.props.modals);

    if (modalsChanged) return true;
    else return false;
  }
  
  changeSuit = weight => {
    this.props.updateGameFactor("chosenWeight", weight);
    this.props.hideModal("ace");
    this.props.endTurn();
  };

  demandCard = type => {
    this.props.updateGameFactor("chosenType", type);
    if (type === "") this.props.updateGameFactor("jackActive", 0);
    this.props.hideModal("jack");
    this.props.endTurn();
  };

  render() {
    const modals = this.props.modals;
    const gameState = this.props.gameState,
      playerWon = !gameState.player.cards.length ? true : false;
    return (
      <Aux>
        <ReactModal
          isOpen={modals.ace && !modals.gameOver}
          ariaHideApp={false}
          className="suit-popup flex-container"
          overlayClassName="overlay"
        >
          <ChangeSuitModal changeSuit={this.changeSuit} />
        </ReactModal>

        <ReactModal
          isOpen={modals.jack && !modals.gameOver}
          ariaHideApp={false}
          className="suit-popup flex-container"
          overlayClassName="overlay"
        >
          <DemandCardModal demandCard={this.demandCard} />
        </ReactModal>

        <ReactModal
          isOpen={modals.gameOver}
          ariaHideApp={false}
          className="suit-popup flex-container"
          overlayClassName="overlay"
        >
          <GameOverModal
            show={modals.gameOver}
            playerWon={playerWon}
            restartGame={this.props.restartGame}
          />
        </ReactModal>

        <MacaoModal
          show={modals.macao && !modals.gameOver}
          playerMacao={gameState.player.cards.length === 1}
          cpuPlayerMacao={gameState.cpuPlayer.cards.length === 1}
        />

        <WhoStartsModal
          show={modals.whoStarts}
          playerStarts={gameState.isPlayerTurn}
        />
      </Aux>
    );
  }
}

const mapStateToProps = state => {
  return {
    modals: state.modals,
    gameState: state.gameState
  };
};

const mapDispatchToProps = dispatch => {
  return {
    hideModal: modal => dispatch({ type: "HIDE_MODAL", modal: modal }),
    updateGameFactor: (factor, value) =>
      dispatch(logicActions.updateGameFactor(factor, value)),
    endTurn: () => {
      dispatch(logicActions.makeCpuMove());
      dispatch(logicActions.checkMacaoAndWin());
    },
    playSound: soundName => dispatch(soundActions.playSound(soundName))
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Modals);
