import React from "react";
import rulesButton from '../../content/images/rules_button.png'

export default function RulesButton(props) {
  return (
    <button onClick={props.onClick} id="restart-game" className="rules-icon">
      <img
        alt="restart"
        className="icon-image"
        src={rulesButton}
      />
    </button>
  );
}
