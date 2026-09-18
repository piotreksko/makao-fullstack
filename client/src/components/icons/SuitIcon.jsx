import React from "react";
import heartsSymbol from "../../content/images/symbols/hearts_symbol.png";
import diamondsSymbol from "../../content/images/symbols/diamonds_symbol.png";
import clubsSymbol from "../../content/images/symbols/clubs_symbol.png";
import spadesSymbol from "../../content/images/symbols/spades_symbol.png";
import changeIcon from "../../content/images/change_icon.png";
import PropTypes from "prop-types";

const SuitIcon = props => {
  let img;

  switch (props.chosenWeight) {
    case "spades":
      img = spadesSymbol;
      break;
    case "clubs":
      img = clubsSymbol;
      break;
    case "diamonds":
      img = heartsSymbol;
      break;
    case "hearts":
      img = diamondsSymbol;
      break;
    default:
      break;
  }

  let style = {
    backgroundImage: changeIcon
  };

  return props.show && !props.gameOver ? (
    <div className={"info-icon modal-shown"} style={style}>
      <img
        alt="Chosen weight symbol"
        className="icon-image grey-icon"
        src={img}
      />
    </div>
  ) : null;
};

SuitIcon.propTypes = {
  show: PropTypes.bool,
  gameOver: PropTypes.bool,
  chosenWeight: PropTypes.string
};

export default SuitIcon;
