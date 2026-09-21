import React from "react";
import Card from "./cards/Card";
import SlideIn from "./SlideIn";
import PropTypes from "prop-types";

export default function Pile({ cards }) {
  if (!cards) return null;

  return (
    <div id="pile">
      {cards.map((card, idx) => (
        <SlideIn
          key={idx}
          x={-50}
          y={card.isFromPlayer ? 200 : -200}
          duration={300}
          delay={50}
        >
          <Card card={card} fromPile={true} />
        </SlideIn>
      ))}
    </div>
  );
}

Pile.propTypes = {
  cards: PropTypes.array
};
