import { seededRng, card, cards } from '../../test/helpers/game-state.js';
import {
  RANKS,
  SUITS,
  battlePenalty,
  cancelsPenalty,
  createDeck,
  shuffle,
  sortHand,
} from './cards.js';

describe('createDeck', () => {
  it('has 52 different cards', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);
    expect(new Set(deck.map((c) => `${c.rank}-${c.suit}`)).size).toBe(52);
  });

  it('has every rank in every suit', () => {
    const deck = createDeck();
    for (const suit of SUITS) {
      expect(deck.filter((c) => c.suit === suit).map((c) => c.rank)).toEqual([
        ...RANKS,
      ]);
    }
  });
});

describe('shuffle', () => {
  it('gives the same order for the same seed', () => {
    const deck = createDeck();
    expect(shuffle(deck, seededRng(1))).toEqual(shuffle(deck, seededRng(1)));
  });

  it('gives a different order for a different seed', () => {
    const deck = createDeck();
    expect(shuffle(deck, seededRng(1))).not.toEqual(
      shuffle(deck, seededRng(2)),
    );
  });

  it('keeps every card and leaves the input alone', () => {
    const deck = createDeck();
    const copy = structuredClone(deck);
    const shuffled = shuffle(deck, seededRng(3));
    expect(deck).toEqual(copy);
    expect(shuffled).toHaveLength(52);
    expect(new Set(shuffled.map((c) => `${c.rank}-${c.suit}`)).size).toBe(52);
  });
});

describe('sortHand', () => {
  it('orders by rank, then by suit', () => {
    expect(sortHand(cards('ac 2h kd 10s 2c jh'))).toEqual(
      cards('2c 2h 10s jh kd ac'),
    );
  });

  it('does not change the input', () => {
    const hand = cards('kd 2c');
    sortHand(hand);
    expect(hand).toEqual(cards('kd 2c'));
  });
});

describe('battle cards', () => {
  it.each([
    ['2h', 2],
    ['3c', 3],
    ['kh', 5],
    ['ks', 5],
    ['kc', 0],
    ['kd', 0],
    ['4h', 0],
    ['7d', 0],
    ['ah', 0],
    ['jh', 0],
  ])('%s carries a penalty of %i', (code, penalty) => {
    expect(battlePenalty(card(code))).toBe(penalty);
  });

  it('only the kings of clubs and diamonds cancel a penalty', () => {
    expect(cancelsPenalty(card('kc'))).toBe(true);
    expect(cancelsPenalty(card('kd'))).toBe(true);
    expect(cancelsPenalty(card('kh'))).toBe(false);
    expect(cancelsPenalty(card('ks'))).toBe(false);
    expect(cancelsPenalty(card('qc'))).toBe(false);
  });
});
