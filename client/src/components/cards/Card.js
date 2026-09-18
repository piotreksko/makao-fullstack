import React, { Component } from "react";
import PropTypes from "prop-types";

class Card extends Component {
  render() {
    const fileName = this.props.card.type + "_of_" + this.props.card.weight;
    const card = require(`../../content/images/cards/${fileName}.png`);

    let cardStyle = {
      backgroundImage: "url(" + card + ")"
    };

    if (this.props.fromPile) {
      cardStyle.position = "absolute";
      if (this.props.card.transform) {
        const { rotate, x, y } = this.props.card.transform;
        cardStyle.transform = `rotate(${rotate}deg) translate(${x}px, ${y}px)`;
      }
    }

    return (
      <div
        onClick={
          this.props.clickOwnCard
            ? e => this.props.clickOwnCard(this.props.card, this.props.index)
            : null
        }
        className={["card", this.props.cardClass].join(" ")}
        style={cardStyle}
      />
    );
  }
}

Card.propTypes = {
  card: PropTypes.object,
  index: PropTypes.number,
  fromPile: PropTypes.bool,
  cardClass: PropTypes.string,
  clickOwnCard: PropTypes.func,
};

export default Card;
