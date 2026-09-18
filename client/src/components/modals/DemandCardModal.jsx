import React from "react";
import PropTypes from "prop-types";
import ModalButton from "../buttons/ModalButton";

export default function DemandCardModal(props) {
  const cardsForDemand = ["5", "6", "7", "8", "9", "10", "queen", ""];
  const nameToDisplay = card =>
    card === "queen" ? "Q" : card === "" ? "X" : card;

  return (
    <div>
      <span>Demand card</span>
      <div className="demand-icons">
        {cardsForDemand.map(card => (
          <ModalButton
            key={card}
            onClick={e => props.demandCard(card)}
            text={nameToDisplay(card)}
          />
        ))}
      </div>
    </div>
  );
}

DemandCardModal.propTypes = {
  demandCard: PropTypes.func
};
