export const SUITS = ['clubs', 'diamonds', 'spades', 'hearts'] as const;
export const RANKS = [
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'jack',
  'queen',
  'king',
  'ace',
] as const;

export type Suit = (typeof SUITS)[number];
export type Rank = (typeof RANKS)[number];

export interface Card {
  rank: Rank;
  suit: Suit;
}

// Returns a number in [0, 1), like Math.random; tests pass a seeded one
export type Rng = () => number;

// Ranks with no effect of their own. A Jack may demand one of them, and the
// game always starts on one.
export const NEUTRAL_RANKS: readonly Rank[] = [
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'queen',
];

export const createDeck = (): Card[] =>
  SUITS.flatMap((suit) => RANKS.map((rank) => ({ rank, suit })));

export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export const sameCard = (a: Card, b: Card): boolean =>
  a.rank === b.rank && a.suit === b.suit;

export function sortHand(cards: readonly Card[]): Card[] {
  return [...cards].sort(
    (a, b) =>
      RANKS.indexOf(a.rank) - RANKS.indexOf(b.rank) ||
      SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit),
  );
}

// 2, 3, king of hearts and king of spades force the next player to draw
export function battlePenalty(card: Card): number {
  if (card.rank === '2') return 2;
  if (card.rank === '3') return 3;
  if (
    card.rank === 'king' &&
    (card.suit === 'hearts' || card.suit === 'spades')
  ) {
    return 5;
  }
  return 0;
}

export const isBattleCard = (card: Card): boolean => battlePenalty(card) > 0;

// King of clubs and king of diamonds cancel a pending penalty
export const cancelsPenalty = (card: Card): boolean =>
  card.rank === 'king' && (card.suit === 'clubs' || card.suit === 'diamonds');
