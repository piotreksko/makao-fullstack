import React from "react";
import Card from "./cards/Card";
import PropTypes from "prop-types";
import { CSSTransition, transit } from "react-css-transition";

export default function Pile(props) {
  if (!props.cards) return null;
  CSSTransition.childContextTypes = {};
  const omegalul = true;

  function getPlusMinus(card) {
    return card.isFromPlayer ? '' : '-';
  }

  return (
    <div id="pile">
      {props.cards.map((card, idx) => (
        <CSSTransition
          key={idx}
          transitionDelay={{ enter: 50 }}
          transitionAppear={{ omegalul }}
          defaultStyle={{
            transform: `translate(-50px, ${getPlusMinus(card)}200px)`
          }}
          enterStyle={{
            transform: transit("translate(0, 0)", 300, "ease-in-out")
          }}
          activeStyle={{ transform: "translate(0, 0)" }}
          active={omegalul}
        >
          <Card card={card} fromPile={true} key={idx} />
        </CSSTransition>
      ))}
    </div>
  );
}

Pile.propTypes = {
  cards: PropTypes.array
};
