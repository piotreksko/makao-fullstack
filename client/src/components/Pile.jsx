import React from "react";
import Card from "./cards/Card";
import SlideIn from "./SlideIn";
import PropTypes from "prop-types";

// A small deterministic "messy stack" look, keyed off each card's position in
// the pile rather than randomly, so it doesn't jitter on re-render
const transformFor = idx => ({
  rotate: ((idx * 37) % 21) - 10,
  x: ((idx * 53) % 21) - 10,
  y: ((idx * 17) % 21) - 10
});

export default function Pile({ cards }) {
  if (!cards) return null;

  return (
    <div id="pile">
      {cards.map((card, idx) => (
        <SlideIn key={`${card.rank}_${card.suit}_${idx}`} x={-50} y={-150} duration={300} delay={50}>
          <Card card={{ ...card, transform: transformFor(idx) }} fromPile={true} />
        </SlideIn>
      ))}
    </div>
  );
}

Pile.propTypes = {
  cards: PropTypes.array
};
