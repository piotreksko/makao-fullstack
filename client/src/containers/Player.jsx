import React from "react";
import Aux from "../hoc/Auxilliary";
import SlideIn from "../components/SlideIn";
import ActionButtons from "../components/buttons/ActionButtons";
import Card from "../components/cards/Card";
import WaitIcon from "../components/icons/WaitIcon";

const sameCard = (a, b) => a.rank === b.rank && a.suit === b.suit;

// Which hand cards may be picked next, given what's already selected. legalCards
// (from the server) already accounts for whose turn it is and the drawn-card rule.
const classFor = (card, selectedCards, legalCards) => {
  if (selectedCards.some(c => sameCard(c, card))) {
    const isTop = sameCard(selectedCards[selectedCards.length - 1], card);
    return isTop ? "selected topCard" : "selected";
  }
  if (selectedCards.length) {
    return selectedCards[0].rank === card.rank ? "possible" : "";
  }
  return legalCards.some(c => sameCard(c, card)) ? "available" : "";
};

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
}) => (
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
              clickOwnCard={isMyTurn ? () => onSelectCard(card) : null}
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
