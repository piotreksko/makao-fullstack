import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import Confetti from "react-dom-confetti";
import * as gameActions from "../actions/gameActions";
import * as soundActions from "../actions/soundActions";
import Aux from "../hoc/Auxilliary";
import Modals from "./Modals";
import Header from "./Header";
import Player from "./Player";
import Opponents from "../components/Opponents";
import Icons from "./Icons";
import Deck from "../components/Deck";
import Pile from "../components/Pile";

const sameCard = (a, b) => a.rank === b.rank && a.suit === b.suit;

const confettiConfig = {
  angle: 90,
  spread: 80,
  startVelocity: 50,
  elementCount: 30,
  decay: 0.9
};

export const GameView = ({
  currentRoom,
  onLeave,
  view,
  events,
  playCards,
  drawCard,
  keepCard,
  waitTurn,
  playSound
}) => {
  const [selectedCards, setSelectedCards] = useState([]);
  const [pendingChoice, setPendingChoice] = useState(null);
  const [macaoSeat, setMacaoSeat] = useState(null);
  const [whoStarts, setWhoStarts] = useState(true);

  useEffect(() => {
    playSound("shuffle");
    const timer = setTimeout(() => setWhoStarts(false), 1000);
    return () => clearTimeout(timer);
    // Shown once, when this match's table first mounts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const macaoEvent = events.find(e => e.type === "macao");
    if (!macaoEvent) return undefined;
    setMacaoSeat(macaoEvent.seat);
    const timer = setTimeout(() => setMacaoSeat(null), 1500);
    return () => clearTimeout(timer);
  }, [events]);

  // A fresh view for a turn that isn't ours any more means our last move went
  // through (or someone else moved); either way, any pending selection is stale
  useEffect(() => {
    if (!view?.you || view.currentSeat !== view.you.seat) setSelectedCards([]);
  }, [view]);

  if (!view || !view.you) return null;

  const { you } = view;
  const isMyTurn = view.currentSeat === you.seat;
  const mySummary = view.players.find(p => p.seat === you.seat);

  const toggleCard = card => {
    if (!isMyTurn) return;
    setSelectedCards(prev => {
      const already = prev.some(c => sameCard(c, card));
      if (already) {
        return sameCard(prev[0], card) ? [] : prev.filter(c => !sameCard(c, card));
      }
      if (prev.length === 0) {
        return you.legalCards.some(c => sameCard(c, card)) ? [card] : prev;
      }
      // Several cards may only be played together when they share a rank,
      // and never after drawing (then only the drawn card itself is legal)
      if (you.drawnCard || card.rank !== prev[0].rank) return prev;
      return [...prev, card];
    });
  };

  const confirmCards = () => {
    if (!selectedCards.length) return;
    playSound("click");
    const finishesHand = you.hand.length - selectedCards.length === 0;
    const rank = selectedCards[0].rank;

    if (!finishesHand && rank === "ace") {
      setPendingChoice({ kind: "suit", cards: selectedCards });
      return;
    }
    if (!finishesHand && rank === "jack") {
      setPendingChoice({ kind: "demand", cards: selectedCards });
      return;
    }
    playCards(selectedCards, {});
    setSelectedCards([]);
  };

  const chooseSuit = suit => {
    playCards(pendingChoice.cards, { suit });
    setPendingChoice(null);
    setSelectedCards([]);
  };

  const chooseDemand = demand => {
    playCards(pendingChoice.cards, { demand: demand === "" ? null : demand });
    setPendingChoice(null);
    setSelectedCards([]);
  };

  const opponents = view.players
    .filter(p => p.seat !== you.seat)
    .map(p => {
      const roomPlayer = currentRoom?.players.find(rp => rp.seat === p.seat);
      return {
        seat: p.seat,
        cardCount: p.cardCount,
        skipTurns: p.skipTurns,
        place: p.place,
        name: roomPlayer?.isBot ? "Bot" : (roomPlayer?.user?.displayName ?? `Seat ${p.seat}`)
      };
    });

  return (
    <Aux>
      <Modals
        view={view}
        macaoSeat={macaoSeat}
        whoStarts={whoStarts}
        pendingChoice={pendingChoice}
        onChooseSuit={chooseSuit}
        onChooseDemand={chooseDemand}
        onBackToLobby={onLeave}
      />
      <div className="confetti">
        <Confetti active={you.hand.length === 0} config={confettiConfig} />
      </div>
      <Header onLeave={onLeave} />
      <Opponents seats={opponents} />
      <div className="flex-container middle cards-container">
        <Deck
          onDraw={drawCard}
          canDraw={isMyTurn && !you.drawnCard && view.pendingSkips === 0}
          deckCount={view.deckCount}
        />
        <Pile cards={view.pile} />
        <Icons />
      </div>
      <Player
        hand={you.hand}
        legalCards={you.legalCards}
        drawnCard={you.drawnCard}
        isMyTurn={isMyTurn}
        pendingSkips={view.pendingSkips}
        skipTurns={mySummary?.skipTurns ?? 0}
        selectedCards={selectedCards}
        onSelectCard={toggleCard}
        onConfirm={confirmCards}
        onKeep={keepCard}
        onWait={waitTurn}
      />
    </Aux>
  );
};

const mapStateToProps = state => ({
  view: state.game.view,
  events: state.game.events
});

const mapDispatchToProps = dispatch => ({
  playCards: (cards, choice) => dispatch(gameActions.playCards(cards, choice)),
  drawCard: () => dispatch(gameActions.drawCard()),
  keepCard: () => dispatch(gameActions.keepCard()),
  waitTurn: () => dispatch(gameActions.waitTurn()),
  playSound: soundName => dispatch(soundActions.playSound(soundName))
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(GameView);
