import {
  NEUTRAL_RANKS,
  SUITS,
  createDeck,
  sameCard,
  shuffle,
  sortHand,
  type Card,
  type Rng,
} from './cards.js';
import { IllegalMoveError } from './errors.js';
import type {
  GameEvent,
  GameState,
  Outcome,
  PlayChoice,
  PlayerState,
} from './game.types.js';
import { applyCardEffects, canStartPlay, isValidDemand } from './rules.js';

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 4;
const HAND_SIZE = 5;

// Every action takes a state and returns a NEW state plus the events that
// happened; the state you pass in is never modified.

export function createGame(
  seats: readonly number[],
  rng: Rng = Math.random,
): GameState {
  if (new Set(seats).size !== seats.length) {
    throw new RangeError('Seats must be unique');
  }
  if (seats.length < MIN_PLAYERS || seats.length > MAX_PLAYERS) {
    throw new RangeError(
      `A game needs ${MIN_PLAYERS} to ${MAX_PLAYERS} players, got ${seats.length}`,
    );
  }

  const orderedSeats = [...seats].sort((a, b) => a - b);
  const deck = shuffle(createDeck(), rng);
  const players: PlayerState[] = orderedSeats.map((seat) => ({
    seat,
    hand: sortHand(deck.splice(0, HAND_SIZE)),
    skipTurns: 0,
    place: null,
  }));

  // The game always starts on a card with no effect
  const [startCard] = deck.splice(
    deck.findIndex((card) => NEUTRAL_RANKS.includes(card.rank)),
    1,
  );

  return {
    players,
    deck,
    pile: [startCard],
    currentSeat: orderedSeats[Math.floor(rng() * orderedSeats.length)],
    penalty: 0,
    pendingSkips: 0,
    demand: null,
    chosenSuit: null,
    checkedCard: null,
    ranking: [],
    status: 'playing',
  };
}

// Cards in the player's hand that could start a play right now
export function getLegalCards(state: GameState, seat: number): Card[] {
  const player = state.players.find((p) => p.seat === seat);
  if (!player || state.status === 'finished' || state.currentSeat !== seat) {
    return [];
  }
  if (state.checkedCard) {
    return canStartPlay(state, state.checkedCard) ? [state.checkedCard] : [];
  }
  return player.hand.filter((card) => canStartPlay(state, card));
}

// Play one card, or several cards of the same rank (the last one ends up on top)
export function playCards(
  state: GameState,
  seat: number,
  cards: readonly Card[],
  choice: PlayChoice = {},
): Outcome {
  const player = requireTurn(state, seat);
  validatePlay(state, player, cards, choice);

  const next = structuredClone(state);
  const me = playerAt(next, seat);
  const events: GameEvent[] = [];
  const played = cards.map((card) => ({ ...card }));

  for (const card of played) {
    me.hand.splice(
      me.hand.findIndex((c) => sameCard(c, card)),
      1,
    );
  }
  next.pile.push(...played);
  applyCardEffects(next, played, choice, seat);
  next.checkedCard = null;

  events.push({ type: 'played', seat, cards: played });
  if (me.hand.length === 1) events.push({ type: 'macao', seat });
  if (me.hand.length === 0) finishPlayer(next, me, events);
  if (next.status === 'playing') advanceTurn(next);

  return { state: next, events };
}

// Draw one card. If it could be played the player may play it or keep it;
// otherwise the turn ends (after drawing the rest of a penalty, if any).
export function drawCard(
  state: GameState,
  seat: number,
  rng: Rng = Math.random,
): Outcome {
  requireTurn(state, seat);
  if (state.checkedCard) {
    throw new IllegalMoveError(
      'ALREADY_DRAWN',
      'You already drew a card: play it or keep it',
    );
  }
  if (state.pendingSkips > 0) {
    throw new IllegalMoveError(
      'MUST_ANSWER_WAIT',
      'Play a 4 or wait; you cannot draw',
    );
  }

  const next = structuredClone(state);
  const me = playerAt(next, seat);
  const events: GameEvent[] = [];

  const [card] = takeFromDeck(next, 1, rng, events);
  if (!card) {
    finishDrawing(next, me, rng, events);
    return { state: next, events };
  }

  me.hand = sortHand([...me.hand, card]);
  events.push({ type: 'drew', seat, count: 1 });

  if (canStartPlay(next, card)) {
    next.checkedCard = card;
  } else {
    finishDrawing(next, me, rng, events);
  }
  return { state: next, events };
}

// Decline to play the card just drawn; ends the turn
export function keepDrawnCard(
  state: GameState,
  seat: number,
  rng: Rng = Math.random,
): Outcome {
  requireTurn(state, seat);
  if (!state.checkedCard) {
    throw new IllegalMoveError('NOTHING_DRAWN', 'You have not drawn a card');
  }

  const next = structuredClone(state);
  const events: GameEvent[] = [];
  finishDrawing(next, playerAt(next, seat), rng, events);
  return { state: next, events };
}

// Accept the skipped turns of a 4 you could not (or did not) answer
export function waitTurns(state: GameState, seat: number): Outcome {
  requireTurn(state, seat);
  if (state.pendingSkips === 0) {
    throw new IllegalMoveError(
      'NO_WAIT_PENDING',
      'There is nothing to wait for',
    );
  }

  const next = structuredClone(state);
  const me = playerAt(next, seat);
  const turns = next.pendingSkips;

  // This turn is skipped now; the rest are skipped on this player's next turns
  me.skipTurns += turns - 1;
  next.pendingSkips = 0;
  advanceTurn(next);

  return { state: next, events: [{ type: 'waited', seat, turns }] };
}

function requireTurn(state: GameState, seat: number): PlayerState {
  if (state.status === 'finished') {
    throw new IllegalMoveError('GAME_OVER', 'The game is over');
  }
  const player = state.players.find((p) => p.seat === seat);
  if (!player || state.currentSeat !== seat) {
    throw new IllegalMoveError('NOT_YOUR_TURN', "It's not your turn");
  }
  return player;
}

const playerAt = (state: GameState, seat: number): PlayerState =>
  state.players.find((p) => p.seat === seat)!;

function validatePlay(
  state: GameState,
  player: PlayerState,
  cards: readonly Card[],
  choice: PlayChoice,
): void {
  if (cards.length === 0) {
    throw new IllegalMoveError('NO_CARDS', 'Choose at least one card');
  }

  const remaining = [...player.hand];
  for (const card of cards) {
    const index = remaining.findIndex((c) => sameCard(c, card));
    if (index === -1) {
      throw new IllegalMoveError(
        'CARD_NOT_IN_HAND',
        'You do not hold that card',
      );
    }
    remaining.splice(index, 1);
  }

  if (cards.some((card) => card.rank !== cards[0].rank)) {
    throw new IllegalMoveError(
      'MIXED_RANKS',
      'Cards played together must have the same rank',
    );
  }
  if (
    state.checkedCard &&
    (cards.length !== 1 || !sameCard(cards[0], state.checkedCard))
  ) {
    throw new IllegalMoveError(
      'MUST_PLAY_DRAWN_CARD',
      'After drawing you may only play the card you drew',
    );
  }
  if (!canStartPlay(state, cards[0])) {
    throw new IllegalMoveError(
      'CARD_NOT_PLAYABLE',
      'You cannot play that card now',
    );
  }

  if (choice.suit !== undefined && !SUITS.includes(choice.suit)) {
    throw new IllegalMoveError('INVALID_CHOICE', 'That is not a suit');
  }
  if (choice.demand && !isValidDemand(choice.demand)) {
    throw new IllegalMoveError(
      'INVALID_CHOICE',
      'That rank cannot be demanded',
    );
  }

  // Someone playing their last card has nothing left to decide
  const finishes = remaining.length === 0;
  if (!finishes && cards[0].rank === 'ace' && choice.suit === undefined) {
    throw new IllegalMoveError('CHOICE_REQUIRED', 'Choose a suit for the ace');
  }
  if (!finishes && cards[0].rank === 'jack' && choice.demand === undefined) {
    throw new IllegalMoveError(
      'CHOICE_REQUIRED',
      'Choose a rank to demand, or none, for the jack',
    );
  }
}

// Draws from the top of the deck, first recycling the pile if it runs short
function takeFromDeck(
  state: GameState,
  count: number,
  rng: Rng,
  events: GameEvent[],
): Card[] {
  if (state.deck.length < count && state.pile.length > 1) {
    const top = state.pile[state.pile.length - 1];
    const recycled = shuffle(state.pile.slice(0, -1), rng);
    // The cards still in the deck stay on top so they are drawn first
    state.deck = [...recycled, ...state.deck];
    state.pile = [top];
    events.push({ type: 'reshuffled' });
  }
  return state.deck.splice(Math.max(0, state.deck.length - count), count);
}

// Ends a draw: takes the rest of a penalty (the first card is already drawn)
function finishDrawing(
  state: GameState,
  player: PlayerState,
  rng: Rng,
  events: GameEvent[],
): void {
  if (state.penalty > 1) {
    const extra = takeFromDeck(state, state.penalty - 1, rng, events);
    player.hand = sortHand([...player.hand, ...extra]);
    if (extra.length > 0) {
      events.push({ type: 'drew', seat: player.seat, count: extra.length });
    }
  }
  state.penalty = 0;
  advanceTurn(state);
}

function finishPlayer(
  state: GameState,
  player: PlayerState,
  events: GameEvent[],
): void {
  const place = (seat: PlayerState) => {
    seat.place = state.ranking.length + 1;
    state.ranking.push(seat.seat);
    events.push({ type: 'finished', seat: seat.seat, place: seat.place });
  };

  place(player);
  const stillPlaying = state.players.filter((p) => p.place === null);
  if (stillPlaying.length <= 1) {
    // Whoever is left cannot win anything, so they take the last place
    stillPlaying.forEach(place);
    state.status = 'finished';
    events.push({ type: 'gameOver', ranking: [...state.ranking] });
  }
}

// Moves the turn to the next player who actually gets to act
function advanceTurn(state: GameState): void {
  state.checkedCard = null;
  const { players } = state;
  let index = players.findIndex((p) => p.seat === state.currentSeat);

  for (;;) {
    index = (index + 1) % players.length;
    const candidate = players[index];

    // A Jack's demand lasts one round: it ends when the turn reaches the Jack
    // player's seat again (even if that player has since finished)
    if (state.demand?.until === candidate.seat) state.demand = null;

    if (candidate.place !== null) continue;
    if (candidate.skipTurns > 0) {
      candidate.skipTurns -= 1;
      continue;
    }
    state.currentSeat = candidate.seat;
    return;
  }
}
