import type { CSSProperties } from "react";
import type { Card as CardData } from "../../types";

const cardImages = import.meta.glob<string>("../../content/images/cards/*.png", {
  eager: true,
  import: "default"
});

// Fetch and decode every face when the app loads. The references are kept so
// the browser doesn't discard them before the cards are dealt.
const preloadedFaces = Object.values(cardImages).map(src => {
  const image = new Image();
  image.src = src;
  return image;
});
preloadedFaces.forEach(image => image.decode().catch(() => {}));

// A card lying on the pile, with its "messy stack" offset
export interface PileCard extends CardData {
  transform?: { rotate: number; x: number; y: number };
}

interface CardProps {
  card: PileCard;
  index?: number;
  fromPile?: boolean;
  cardClass?: string;
  clickOwnCard?: (card: CardData, index?: number) => void;
}

const Card = ({ card, index, fromPile, cardClass, clickOwnCard }: CardProps) => {
  const fileName = card.rank + "_of_" + card.suit;
  const image = cardImages[`../../content/images/cards/${fileName}.png`];

  const cardStyle: CSSProperties = {
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
      onClick={clickOwnCard ? () => clickOwnCard(card, index) : undefined}
      className={["card", cardClass].join(" ")}
      style={cardStyle}
    />
  );
};

export default Card;
