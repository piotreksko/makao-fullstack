import React from "react";
import PropTypes from "prop-types";

const cardImages = import.meta.glob("../../content/images/cards/*.png", {
  eager: true,
  import: "default"
});

const Card = ({ card, index, fromPile, cardClass, clickOwnCard }) => {
  const fileName = card.type + "_of_" + card.weight;
  const image = cardImages[`../../content/images/cards/${fileName}.png`];

  const cardStyle = {
    backgroundImage: "url(" + image + ")"
  };

  if (fromPile) {
    cardStyle.position = "absolute";
    if (card.transform) {
      const { rotate, x, y } = card.transform;
      cardStyle.transform = `rotate(${rotate}deg) translate(${x}px, ${y}px)`;
    }
  }

  return (
    <div
      onClick={clickOwnCard ? () => clickOwnCard(card, index) : null}
      className={["card", cardClass].join(" ")}
      style={cardStyle}
    />
  );
};

Card.propTypes = {
  card: PropTypes.object,
  index: PropTypes.number,
  fromPile: PropTypes.bool,
  cardClass: PropTypes.string,
  clickOwnCard: PropTypes.func
};

export default Card;
