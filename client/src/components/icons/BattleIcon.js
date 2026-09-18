import React from "react";
import PropTypes from "prop-types";

const BattleIcon = props => {
  let style = {
    backgroundImage:
      "url(https://cdn.iconscout.com/icon/premium/png-256-thumb/swords-56-798933.png)"
  };
  return props.battleCards > 1 ? (
    <div className={"info-icon modal-shown"} style={style}>
      <div className="red-icon">{props.battleCards - 1}</div>
    </div>
  ) : null;
};

BattleIcon.propTypes = {
  battleCards: PropTypes.number
};

export default BattleIcon;
