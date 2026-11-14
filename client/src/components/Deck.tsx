import CardBack from "./cards/CardBack";

interface DeckProps {
  onDraw: () => void;
  canDraw: boolean;
  deckCount: number;
}

const Deck = ({ canDraw, onDraw, deckCount }: DeckProps) => {
  const howManyToRender = Math.floor(deckCount / 10) + 2;
  const deckToRender = [];
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

export default Deck;
