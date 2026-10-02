import type { Card, Suit } from './cards.js';
import { getLegalCards } from './engine.js';
import type { GameState, JackDemand } from './game.types.js';

// How many cards from the top of the pile a client is shown
export const PILE_CARDS_SHOWN = 8;

export interface PlayerSummary {
  seat: number;
  cardCount: number;
  skipTurns: number;
  place: number | null;
}

// What one player is allowed to know about the game. Other players' hands and
// the order of the deck never appear here.
export interface GameView {
  status: 'playing' | 'finished';
  currentSeat: number;
  ranking: number[];
  // Private to the viewer; null for someone who is not in the game
  you: {
    seat: number;
    hand: Card[];
    legalCards: Card[];
    // The card just drawn, while deciding whether to play it
    drawnCard: Card | null;
  } | null;
  players: PlayerSummary[];
  deckCount: number;
  pile: Card[];
  pileCount: number;
  penalty: number;
  pendingSkips: number;
  demand: JackDemand | null;
  chosenSuit: Suit | null;
  // Public: someone is deciding about a card they just drew
  hasDrawn: boolean;
}

export function buildGameView(state: GameState, seat: number | null): GameView {
  const me = state.players.find((p) => p.seat === seat);

  return {
    status: state.status,
    currentSeat: state.currentSeat,
    ranking: [...state.ranking],
    you: me
      ? {
          seat: me.seat,
          hand: me.hand.map((card) => ({ ...card })),
          legalCards: getLegalCards(state, me.seat),
          drawnCard:
            state.checkedCard && state.currentSeat === me.seat
              ? { ...state.checkedCard }
              : null,
        }
      : null,
    players: state.players.map((p) => ({
      seat: p.seat,
      cardCount: p.hand.length,
      skipTurns: p.skipTurns,
      place: p.place,
    })),
    deckCount: state.deck.length,
    pile: state.pile.slice(-PILE_CARDS_SHOWN).map((card) => ({ ...card })),
    pileCount: state.pile.length,
    penalty: state.penalty,
    pendingSkips: state.pendingSkips,
    demand: state.demand ? { ...state.demand } : null,
    chosenSuit: state.chosenSuit,
    hasDrawn: state.checkedCard !== null,
  };
}
