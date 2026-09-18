import React from "react";
import CardBack from "./cards/CardBack";
import PropTypes from "prop-types";

const Deck = props => {
  const {
    isPlayerTurn,
    takeCard,
    playerCanMove,
    firstCardChecked,
    cardsToTake
  } = props;
  const number = props.cardsInDeck;
  let howManyToRender = parseInt(number / 10) + 2;
  let deckToRender = [];
  const canBeTaken =
    isPlayerTurn &&
    (!firstCardChecked || (firstCardChecked && cardsToTake > 1));
  for (let i = 0; i < howManyToRender; i++) {
    let cardToPush = (
      <CardBack
        key={i}
        number={i}
        highlight={i === 0 && canBeTaken ? true : false}
        canBeTaken={canBeTaken}
        deckCard={true}
        takeCard={takeCard}
        playerCanMove={playerCanMove}
      />
    );

    deckToRender.push(cardToPush);
  }

  return <div className="deck">{deckToRender}</div>;
};

Deck.propTypes = {
  takeCard: PropTypes.func,
  isPlayerTurn: PropTypes.bool,
  playerCanMove: PropTypes.bool,
  cardsInDeck: PropTypes.number,
  cardsToTake: PropTypes.number,
  firstCardChecked: PropTypes.bool
};

export default Deck;
