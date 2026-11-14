import Aux from "../hoc/Auxilliary";
import SlideIn from "../components/SlideIn";
import ActionButtons from "../components/buttons/ActionButtons";
import Card from "../components/cards/Card";
import WaitIcon from "../components/icons/WaitIcon";
import type { Card as CardData } from "../types";

const sameCard = (a: CardData, b: CardData) => a.rank === b.rank && a.suit === b.suit;

// Which hand cards may be picked next, given what's already selected. legalCards
// (from the server) already accounts for whose turn it is and the drawn-card rule.
const classFor = (card: CardData, selectedCards: CardData[], legalCards: CardData[]) => {
  if (selectedCards.some(c => sameCard(c, card))) {
    const isTop = sameCard(selectedCards[selectedCards.length - 1], card);
    return isTop ? "selected topCard" : "selected";
  }
  if (selectedCards.length) {
    return selectedCards[0].rank === card.rank ? "possible" : "";
  }
  return legalCards.some(c => sameCard(c, card)) ? "available" : "";
};

interface PlayerProps {
  hand: CardData[];
  legalCards: CardData[];
  drawnCard: CardData | null;
  isMyTurn: boolean;
  pendingSkips: number;
  skipTurns: number;
  selectedCards: CardData[];
  onSelectCard: (card: CardData) => void;
  onConfirm: () => void;
  onKeep: () => void;
  onWait: () => void;
}

const Player = ({
  hand,
  legalCards,
  drawnCard,
  isMyTurn,
  pendingSkips,
  skipTurns,
  selectedCards,
  onSelectCard,
  onConfirm,
  onKeep,
  onWait
}: PlayerProps) => (
  <Aux>
    <div className="flex-container cards-container">
      <div className="row cards">
        {hand.map((card, index) => (
          <SlideIn
            key={`${card.rank}_${card.suit}`}
            x={-100}
            y={-200}
            duration={250}
            delay={(index + 1) * 50}
          >
            <Card
              card={card}
              index={index}
              clickOwnCard={isMyTurn ? () => onSelectCard(card) : undefined}
              cardClass={`${classFor(card, selectedCards, legalCards)} cardsInHand`}
            />
          </SlideIn>
        ))}
      </div>
      <WaitIcon waitTurn={skipTurns} />
    </div>
    <ActionButtons
      confirmCards={onConfirm}
      hasSelected={selectedCards.length}
      isPlayerTurn={isMyTurn}
      waitTurn={onWait}
      playerCanWait={pendingSkips > 0}
      canKeep={!!drawnCard}
      onKeep={onKeep}
    />
  </Aux>
);

export default Player;
