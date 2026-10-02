import { seededRng } from '../../test/helpers/game-state.js';
import { NEUTRAL_RANKS, RANKS, SUITS, type Card } from './cards.js';
import { createGame } from './engine.js';

const allCards = (state: ReturnType<typeof createGame>): Card[] => [
  ...state.players.flatMap((p) => p.hand),
  ...state.deck,
  ...state.pile,
];

describe('createGame', () => {
  it.each([2, 3, 4])('deals 5 cards each to %i players', (count) => {
    const seats = Array.from({ length: count }, (_, i) => i);
    const state = createGame(seats, seededRng(10));

    expect(state.players).toHaveLength(count);
    state.players.forEach((p) => expect(p.hand).toHaveLength(5));
    expect(state.pile).toHaveLength(1);
    expect(state.deck).toHaveLength(52 - 5 * count - 1);
  });

  it('accounts for all 52 cards exactly once', () => {
    const state = createGame([0, 1, 2], seededRng(7));
    const cards = allCards(state);
    expect(cards).toHaveLength(52);
    expect(new Set(cards.map((c) => `${c.rank}-${c.suit}`)).size).toBe(52);
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        expect(cards).toContainEqual({ rank, suit });
      }
    }
  });

  it('always starts on a card with no effect', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const state = createGame([0, 1, 2, 3], seededRng(seed));
      expect(NEUTRAL_RANKS).toContain(state.pile[0].rank);
    }
  });

  it('keeps players in seat order even when seats have gaps', () => {
    const state = createGame([3, 0, 2], seededRng(1));
    expect(state.players.map((p) => p.seat)).toEqual([0, 2, 3]);
  });

  it('gives the first turn to one of the seated players', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const state = createGame([1, 4], seededRng(seed));
      expect([1, 4]).toContain(state.currentSeat);
    }
  });

  it('is fully determined by the random number generator', () => {
    expect(createGame([0, 1], seededRng(5))).toEqual(
      createGame([0, 1], seededRng(5)),
    );
    expect(createGame([0, 1], seededRng(5))).not.toEqual(
      createGame([0, 1], seededRng(6)),
    );
  });

  it('starts with no effects pending and hands sorted', () => {
    const state = createGame([0, 1], seededRng(2));
    expect(state).toMatchObject({
      penalty: 0,
      pendingSkips: 0,
      demand: null,
      chosenSuit: null,
      checkedCard: null,
      ranking: [],
      status: 'playing',
    });
    state.players.forEach((p) => {
      expect(p).toMatchObject({ skipTurns: 0, place: null });
      const ranks = p.hand.map((c) => RANKS.indexOf(c.rank));
      expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    });
  });

  it.each([[[0]], [[0, 1, 2, 3, 4]], [[]]])('rejects %j players', (seats) => {
    expect(() => createGame(seats)).toThrow(RangeError);
  });

  it('rejects duplicate seats', () => {
    expect(() => createGame([1, 1])).toThrow('unique');
  });
});
