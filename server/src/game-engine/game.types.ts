import type { Card, Rank, Suit } from './cards.js';

export interface PlayerState {
  seat: number;
  hand: Card[];
  // Future turns this player will be skipped (from a 4 they could not answer)
  skipTurns: number;
  // 1 = first to run out of cards; null while still playing
  place: number | null;
}

// A Jack demands a rank until the turn comes back around to whoever played it
export interface JackDemand {
  rank: Rank;
  until: number;
}

export interface GameState {
  // Sorted by seat, which is also the turn order
  players: PlayerState[];
  // The top of both piles is the LAST element
  deck: Card[];
  pile: Card[];
  currentSeat: number;
  // Cards the current player must draw unless they answer with a battle card
  penalty: number;
  // Turns the current player must skip unless they answer with a 4
  pendingSkips: number;
  demand: JackDemand | null;
  // Set by an Ace, and only relevant while that Ace is on top of the pile
  chosenSuit: Suit | null;
  // The card the current player just drew and may still play (or keep)
  checkedCard: Card | null;
  // Seats in the order they ran out of cards
  ranking: number[];
  status: 'playing' | 'finished';
}

// What a player decides when playing an Ace (suit) or a Jack (demand)
export interface PlayChoice {
  suit?: Suit;
  // A rank to demand, or null for "no demand"
  demand?: Rank | null;
}

export type GameEvent =
  | { type: 'played'; seat: number; cards: Card[] }
  | { type: 'drew'; seat: number; count: number }
  | { type: 'waited'; seat: number; turns: number }
  | { type: 'reshuffled' }
  | { type: 'macao'; seat: number }
  | { type: 'finished'; seat: number; place: number }
  | { type: 'gameOver'; ranking: number[] };

export interface Outcome {
  state: GameState;
  events: GameEvent[];
}
