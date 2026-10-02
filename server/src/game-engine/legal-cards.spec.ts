import { cards, makeState } from '../../test/helpers/game-state.js';
import { getLegalCards } from './engine.js';

const legal = (state: ReturnType<typeof makeState>, seat = 0) =>
  getLegalCards(state, seat);

describe('which cards are legal', () => {
  describe('on an ordinary turn', () => {
    const state = makeState({
      hands: { 0: '7c 9h 8d qs', 1: '2c' },
      pile: '7h',
    });

    it('allows the same rank or the same suit as the top card', () => {
      expect(legal(state)).toEqual(cards('7c 9h'));
    });

    it('allows nothing when nothing matches', () => {
      const stuck = makeState({ hands: { 0: '8d qs' }, pile: '7h' });
      expect(legal(stuck)).toEqual([]);
    });
  });

  it('gives nothing to a player whose turn it is not', () => {
    const state = makeState({ hands: { 0: '7c', 1: '7d' }, pile: '7h' });
    expect(legal(state, 1)).toEqual([]);
  });

  it('gives nothing once the game is over', () => {
    const state = makeState({
      hands: { 0: '7c', 1: '7d' },
      pile: '7h',
      status: 'finished',
    });
    expect(legal(state)).toEqual([]);
  });

  describe('after an ace', () => {
    it('allows the chosen suit or another ace', () => {
      const state = makeState({
        hands: { 0: '2h 2c ac 5s' },
        pile: 'as',
        chosenSuit: 'hearts',
      });
      expect(legal(state)).toEqual(cards('2h ac'));
    });

    it('falls back to the ace’s own suit when no suit was chosen', () => {
      const state = makeState({ hands: { 0: '2s 2c 3h' }, pile: 'as' });
      expect(legal(state)).toEqual(cards('2s'));
    });
  });

  describe('while a jack’s demand is active', () => {
    const state = makeState({
      hands: { 0: '7c 7h 9h jd 8s' },
      pile: '9c',
      demand: { rank: '7', until: 1 },
    });

    it('allows only the demanded rank or a jack', () => {
      expect(legal(state)).toEqual(cards('7c 7h jd'));
    });

    it('does not let the top card’s suit or rank through', () => {
      expect(legal(state)).not.toContainEqual(cards('9h')[0]);
    });
  });

  describe('facing a penalty', () => {
    it('answers a 2 with another 2, or a 2 or 3 of the same suit', () => {
      const state = makeState({
        hands: { 0: '2c 3h 3d 4h kh 7h' },
        pile: '2h',
        penalty: 2,
      });
      expect(legal(state)).toEqual(cards('2c 3h'));
    });

    it('answers a 3 with another 3, or a 2 or 3 of the same suit', () => {
      const state = makeState({
        hands: { 0: '3d 2s 2c 9s' },
        pile: '3s',
        penalty: 3,
      });
      expect(legal(state)).toEqual(cards('3d 2s'));
    });

    it('answers a battle king with any king, or a 2 or 3 of its suit', () => {
      const state = makeState({
        hands: { 0: 'kc kd ks 2h 3h 2d 5h' },
        pile: 'kh',
        penalty: 5,
      });
      expect(legal(state)).toEqual(cards('kc kd ks 2h 3h'));
    });

    it('does not allow a jack, an ace or a matching suit', () => {
      const state = makeState({
        hands: { 0: 'jh ah 7h' },
        pile: '2h',
        penalty: 2,
      });
      expect(legal(state)).toEqual([]);
    });
  });

  describe('facing a 4', () => {
    it('allows only 4s', () => {
      const state = makeState({
        hands: { 0: '4c 4h 9h 7c' },
        pile: '4d',
        pendingSkips: 1,
      });
      expect(legal(state)).toEqual(cards('4c 4h'));
    });
  });

  describe('right after drawing a card', () => {
    it('allows only the drawn card, and only if it fits', () => {
      const fits = makeState({
        hands: { 0: '7c 9h' },
        pile: '7h',
        checkedCard: { rank: '9', suit: 'hearts' },
      });
      expect(legal(fits)).toEqual(cards('9h'));

      const doesNotFit = makeState({
        hands: { 0: '7c 9d' },
        pile: '7h',
        checkedCard: { rank: '9', suit: 'diamonds' },
      });
      expect(legal(doesNotFit)).toEqual([]);
    });
  });
});
