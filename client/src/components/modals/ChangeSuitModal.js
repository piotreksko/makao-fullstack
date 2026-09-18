import React from "react";
import PropTypes from "prop-types";
import { cardSuits } from "../../constants/constants";
import ModalButton from "../buttons/ModalButton";

export default function ChangeSuitModal(props) {
  return (
    <div>
      <span>Pick card suit</span>
      <div className="suit-pick">
        {cardSuits.map(suit => (
          <ModalButton
            key={suit}
            onClick={e => props.changeSuit(suit)}
            image={`symbols/${suit}_symbol`}
          />
        ))}
      </div>
    </div>
  );
}

ChangeSuitModal.propTypes = {
  changeSuit: PropTypes.func
};
