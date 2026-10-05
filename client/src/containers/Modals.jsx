import React from "react";
import ReactModal from "react-modal";
import Aux from "../hoc/Auxilliary";
import ChangeSuitModal from "../components/modals/ChangeSuitModal";
import DemandCardModal from "../components/modals/DemandCardModal";
import GameOverModal from "../components/modals/GameOverModal";
import MacaoModal from "../components/modals/MacaoModal";
import WhoStartsModal from "../components/modals/WhoStartsModal";

// Explicit positioning, so ReactModal's own defaults can't move the popup
const popupStyle = {
  content: {
    position: "fixed",
    top: "38%",
    left: "50%",
    right: "auto",
    bottom: "auto",
    margin: 0,
    transform: "translate(-50%, -50%)"
  }
};

// Everything here is driven by props from GameView rather than its own redux
// slice: ace/jack choices carry the pending cards, macao/whoStarts are one-shot
// reactions to events, and game over is just the view's own status.
export default function Modals({
  view,
  macaoSeat,
  whoStarts,
  pendingChoice,
  onChooseSuit,
  onChooseDemand,
  onBackToLobby
}) {
  const you = view.you;
  const gameOver = view.status === "finished";
  const youWon = gameOver && view.ranking[0] === you?.seat;

  return (
    <Aux>
      <ReactModal
        isOpen={pendingChoice?.kind === "suit"}
        ariaHideApp={false}
        className="suit-popup flex-container"
        overlayClassName="overlay"
        style={popupStyle}
      >
        <ChangeSuitModal changeSuit={onChooseSuit} />
      </ReactModal>

      <ReactModal
        isOpen={pendingChoice?.kind === "demand"}
        ariaHideApp={false}
        className="suit-popup flex-container"
        overlayClassName="overlay"
        style={popupStyle}
      >
        <DemandCardModal demandCard={onChooseDemand} />
      </ReactModal>

      <ReactModal
        isOpen={gameOver}
        ariaHideApp={false}
        className="suit-popup flex-container"
        overlayClassName="overlay"
        style={popupStyle}
      >
        <GameOverModal show={gameOver} playerWon={youWon} restartGame={onBackToLobby} />
      </ReactModal>

      <MacaoModal
        show={macaoSeat != null}
        playerMacao={macaoSeat != null && macaoSeat === you?.seat}
        otherSeatMacao={macaoSeat != null && macaoSeat !== you?.seat ? macaoSeat : null}
      />

      <WhoStartsModal
        show={whoStarts}
        playerStarts={view.currentSeat === you?.seat}
        startingSeat={view.currentSeat}
      />
    </Aux>
  );
}
