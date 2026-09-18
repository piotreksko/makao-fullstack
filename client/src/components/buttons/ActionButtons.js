import React from "react";
import PropTypes from "prop-types";

export default function ActionButtons(props) {
  return (
    <div className="buttons">
      <button
        onClick={props.confirmCards}
        className={
          "btn btn-success confirm-button mr-2 " + ((!props.hasSelected || !props.isPlayerTurn) && !props.firstCardChecked ? "disabled" : "")
        }
        data-toggle="confirmation"
        data-singleton="true"
      >
        End turn
      </button>
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
  actions: PropTypes.shape({
    confirmCards: PropTypes.func,
    resetCards: PropTypes.func
  }),
  hasSelected: PropTypes.number,
  playerCanWait: PropTypes.bool
};
