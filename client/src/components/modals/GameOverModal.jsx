import React from "react";
import PropTypes from "prop-types";
import ModalButton from "../buttons/ModalButton";

export default function GameOverModal(props) {
  return (
    <div className={`center ${props.show ? "modal-shown" : "modal-hidden"}`}>
      <h2 style={{ color: props.playerWon ? "green" : "red" }}>
        {props.playerWon ? "Victory" : "Defeat"}
      </h2>
      <h4 style={{ color: "white" }}>
        {props.playerWon ? "You have won" : "Computer has won"}
      </h4>
      <ModalButton onClick={() => props.restartGame()} image={"restart_button"} />
      <h5 style={{ color: "white" }}>Play again</h5>
    </div>
  );
}

GameOverModal.propTypes = {
  show: PropTypes.bool,
  playerWon: PropTypes.bool,
  restartGame: PropTypes.func
};
