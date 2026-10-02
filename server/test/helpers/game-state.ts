import {
  IllegalMoveError,
  type Card,
  type GameState,
  type IllegalMoveCode,
  type Rank,
  type Rng,
  type Suit,
} from '../../src/game-engine/index.js';

const SUIT_LETTERS: Record<string, Suit> = {
  c: 'clubs',
  d: 'diamonds',
  s: 'spades',
  h: 'hearts',
};
const RANK_LETTERS: Record<string, Rank> = {
  j: 'jack',
  q: 'queen',
  k: 'king',
  a: 'ace',
};

// '7h' = 7 of hearts, '10s' = 10 of spades, 'kd' = king of diamonds
export function card(code: string): Card {
  const suit = SUIT_LETTERS[code.slice(-1)];
  const rankPart = code.slice(0, -1);
  const rank = RANK_LETTERS[rankPart] ?? (rankPart as Rank);
  if (!suit || !rank) throw new Error(`Bad card code: ${code}`);
  return { rank, suit };
}

// '7h 8d kc' = three cards
export const cards = (codes: string): Card[] =>
  codes.trim() === '' ? [] : codes.trim().split(/\s+/).map(card);

interface StateSpec extends Partial<
  Omit<GameState, 'players' | 'pile' | 'deck'>
> {
  hands: Record<number, string>;
  pile?: string;
  deck?: string;
  // seat -> turns that seat will still be skipped
  skips?: Record<number, number>;
}

// A game in exactly the situation a test describes. The top of the pile and
// of the deck is the LAST card listed.
export function makeState(spec: StateSpec): GameState {
  const { hands, pile, deck, skips, ...rest } = spec;
  const seats = Object.keys(hands)
    .map(Number)
    .sort((a, b) => a - b);

  return {
    players: seats.map((seat) => ({
      seat,
      hand: cards(hands[seat]),
      skipTurns: skips?.[seat] ?? 0,
      place: null,
    })),
    deck: cards(deck ?? '6c 7c 8c 9c 10c 6d 7d 8d 9d 10d'),
    pile: cards(pile ?? '5h'),
    currentSeat: seats[0],
    penalty: 0,
    pendingSkips: 0,
    demand: null,
    chosenSuit: null,
    checkedCard: null,
    ranking: [],
    status: 'playing',
    ...rest,
  };
}

export const handOf = (state: GameState, seat: number): Card[] =>
  state.players.find((p) => p.seat === seat)!.hand;

// The error code a move is rejected with (fails if it is not rejected)
export function illegalCode(move: () => unknown): IllegalMoveCode {
  try {
    move();
  } catch (error) {
    if (error instanceof IllegalMoveError) return error.code;
    throw error;
  }
  throw new Error('Expected the move to be rejected');
}

// A small deterministic random number generator (mulberry32)
export function seededRng(seed: number): Rng {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
