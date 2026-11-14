import classNames from "classnames";
import cardBack from "../../content/images/cards/card_back.png";

interface CardBackProps {
  number?: number;
  takeCard?: () => void;
  deckCard?: boolean;
  highlight?: boolean;
  canBeTaken?: boolean;
  playerCanMove?: boolean;
}

const CardBack = (props: CardBackProps) => {
  const cardStyle = {
    backgroundImage: "url(" + cardBack + ")",
    transform: props.deckCard ? `translateY(-${(props.number ?? 0) * 3}px)` : undefined
  };
  const deckIsPossible = () =>
    props.highlight && props.playerCanMove && props.deckCard;
  const cardClasses = classNames({
    card: true,
    deckPossible: deckIsPossible(),
    cardsInHand: !props.deckCard
  });
  return (
    <div
      className={cardClasses}
      onClick={
        props.playerCanMove && props.deckCard && props.canBeTaken
          ? props.takeCard
          : undefined
      }
      style={cardStyle}
    />
  );
};

export default CardBack;
