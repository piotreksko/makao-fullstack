import React from "react";
import restartButton from '../../content/images/restart_button.png'

export default function RestartButton (props) {
    return (
      <button className="rules-icon" onClick={props.onClick}>
        <img
          alt="rules"
          className="icon-image"
          src={restartButton}
        />
      </button>
    );
}
