import React from "react";
import PropTypes from "prop-types";

const DemandIcon = props => {
  let style = {
    backgroundImage:
      "url(https://cdn.iconscout.com/icon/premium/png-256-thumb/demand-3-549092.png)"
  };
  return props.jackActive && !props.gameOver ? (
    <div className={"info-icon modal-shown"} style={style}>
      <div className="orange-icon">
        {props.chosenType !== "queen" ? props.chosenType : "Q"}
      </div>
    </div>
  ) : null;
};

DemandIcon.propTypes = {
  gameOver: PropTypes.bool,
  jackActive: PropTypes.bool,
  chosenType: PropTypes.string
};

export default DemandIcon;
