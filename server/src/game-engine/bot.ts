import {
  NEUTRAL_RANKS,
  SUITS,
  sameCard,
  type Card,
  type Rank,
  type Rng,
  type Suit,
} from './cards.js';
import {
  drawCard,
  getLegalCards,
  keepDrawnCard,
  playCards,
  waitTurns,
} from './engine.js';
import type { GameState, Outcome, PlayChoice } from './game.types.js';

// A deliberately simple opponent: it plays a legal card whenever it can and
// draws when it cannot. It is a placeholder for a smarter bot, but because it
// only ever uses the engine's own legal moves it can never cheat.
export function botMove(state: GameState, rng: Rng = Math.random): Outcome {
  const seat = state.currentSeat;
  const hand = state.players.find((p) => p.seat === seat)!.hand;
  const legal = getLegalCards(state, seat);

  if (state.pendingSkips > 0) {
    return legal.length > 0
      ? playSameRank(state, hand, legal[0], rng)
      : waitTurns(state, seat);
  }
  if (state.checkedCard) {
    return legal.length > 0
      ? playSameRank(state, hand, state.checkedCard, rng, true)
      : keepDrawnCard(state, seat, rng);
  }
  if (legal.length > 0) {
    return playSameRank(
      state,
      hand,
      legal[Math.floor(rng() * legal.length)],
      rng,
    );
  }
  return drawCard(state, seat, rng);
}

// Plays the card together with every other card of its rank in the hand
// (unless it is the card just drawn, which must be played alone)
function playSameRank(
  state: GameState,
  hand: readonly Card[],
  first: Card,
  rng: Rng,
  alone = false,
): Outcome {
  const others = alone
    ? []
    : hand.filter((c) => c.rank === first.rank && !sameCard(c, first));
  const played = [first, ...others];
  const remaining = hand.filter((c) => !played.some((p) => sameCard(p, c)));

  return playCards(state, state.currentSeat, played, choiceFor(remaining, rng));
}

// For an ace or jack: pick what the rest of the hand has the most of
function choiceFor(remaining: readonly Card[], rng: Rng): PlayChoice {
  const suit = mostCommon<Suit>(
    remaining.map((c) => c.suit),
    SUITS,
  );
  const demand = mostCommon<Rank>(
    remaining.map((c) => c.rank).filter((r) => NEUTRAL_RANKS.includes(r)),
    NEUTRAL_RANKS,
  );
  return {
    suit: suit ?? SUITS[Math.floor(rng() * SUITS.length)],
    demand: demand ?? null,
  };
}

function mostCommon<T>(values: readonly T[], order: readonly T[]): T | null {
  let best: T | null = null;
  let bestCount = 0;
  for (const candidate of order) {
    const count = values.filter((v) => v === candidate).length;
    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }
  return best;
}
