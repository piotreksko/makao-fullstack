import React from "react";
import CardBack from "./cards/CardBack";
import PropTypes from "prop-types";

const Deck = props => {
  const { canDraw, onDraw, deckCount } = props;
  let howManyToRender = parseInt(deckCount / 10) + 2;
  let deckToRender = [];
  for (let i = 0; i < howManyToRender; i++) {
    deckToRender.push(
      <CardBack
        key={i}
        number={i}
        highlight={i === 0 && canDraw}
        canBeTaken={canDraw}
        deckCard={true}
        takeCard={onDraw}
        playerCanMove={canDraw}
      />
    );
  }

  return <div className="deck">{deckToRender}</div>;
};

Deck.propTypes = {
  onDraw: PropTypes.func,
  canDraw: PropTypes.bool,
  deckCount: PropTypes.number
};

export default Deck;
