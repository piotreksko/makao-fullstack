import React from "react";
import PropTypes from "prop-types";

export default function WhoStartsModal(props) {
  return (
    <div
      className={`center suit-popup flex-container ${
        props.show ? "modal-shown" : "modal-hidden"
      }`}
      style={{
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)"
      }}
    >
      <h4 style={{ color: "white", margin: 10, padding: 10 }}>
        {props.playerStarts ? "You go first" : "Computer goes first"}
      </h4>
    </div>
  );
}

WhoStartsModal.propTypes = {
  show: PropTypes.bool,
  playerStarts: PropTypes.bool
};
