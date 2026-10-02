import {
  battlePenalty,
  cancelsPenalty,
  NEUTRAL_RANKS,
  type Card,
} from './cards.js';
import type { GameState, PlayChoice } from './game.types.js';

export const topCard = (state: GameState): Card =>
  state.pile[state.pile.length - 1];

// A battle card can be answered by the same rank (a king on any king, which is
// how a king of clubs/diamonds cancels a battle king), or by a 2 or 3 of the
// same suit
const answersBattle = (card: Card, top: Card): boolean =>
  card.rank === top.rank ||
  (card.suit === top.suit && (card.rank === '2' || card.rank === '3'));

// Whether this card may be the first card of a play right now
export function canStartPlay(state: GameState, card: Card): boolean {
  const top = topCard(state);

  if (state.pendingSkips > 0) return card.rank === '4';
  if (state.penalty > 0) return answersBattle(card, top);
  if (state.demand) {
    return card.rank === state.demand.rank || card.rank === 'jack';
  }
  if (top.rank === 'ace' && state.chosenSuit) {
    return card.rank === 'ace' || card.suit === state.chosenSuit;
  }
  return card.rank === top.rank || card.suit === top.suit;
}

// What playing these cards (in this order) does to the game
export function applyCardEffects(
  state: GameState,
  cards: readonly Card[],
  choice: PlayChoice,
  seat: number,
): void {
  for (const card of cards) {
    if (card.rank === '4') {
      state.pendingSkips += 1;
    } else if (cancelsPenalty(card)) {
      state.penalty = 0;
    } else {
      state.penalty += battlePenalty(card);
    }
  }

  const last = cards[cards.length - 1];
  if (last.rank === 'jack') {
    state.demand = choice.demand ? { rank: choice.demand, until: seat } : null;
  }
  state.chosenSuit = last.rank === 'ace' ? (choice.suit ?? null) : null;
}

export const isValidDemand = (rank: unknown): boolean =>
  typeof rank === 'string' && NEUTRAL_RANKS.includes(rank as never);
