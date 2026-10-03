import React from "react";
import PropTypes from "prop-types";

export default function ActionButtons(props) {
  return (
    <div className="buttons">
      <button
        onClick={props.confirmCards}
        className={
          "btn btn-success confirm-button mr-2 " + (!props.hasSelected || !props.isPlayerTurn ? "disabled" : "")
        }
        data-toggle="confirmation"
        data-singleton="true"
      >
        Play
      </button>
      {props.canKeep && props.isPlayerTurn ? (
        <button onClick={props.onKeep} className="btn btn-secondary mr-2">
          Keep card
        </button>
      ) : null}
      {props.playerCanWait && props.isPlayerTurn ? (
        <button
          onClick={props.waitTurn}
          className="btn btn-primary"
          data-toggle="confirmation"
          data-singleton="true"
        >
          Wait
        </button>
      ) : null}
    </div>
  );
}

ActionButtons.propTypes = {
  confirmCards: PropTypes.func,
  onKeep: PropTypes.func,
  waitTurn: PropTypes.func,
  hasSelected: PropTypes.number,
  isPlayerTurn: PropTypes.bool,
  canKeep: PropTypes.bool,
  playerCanWait: PropTypes.bool
};
