import {
  card,
  cards,
  handOf,
  illegalCode,
  makeState,
  seededRng,
} from '../../test/helpers/game-state.js';
import { drawCard, keepDrawnCard, playCards } from './engine.js';
import { topCard } from './rules.js';

describe('drawing a card', () => {
  describe('when nothing is owed', () => {
    it('ends the turn if the drawn card cannot be played', () => {
      const state = makeState({
        hands: { 0: '2d', 1: '2c' },
        pile: '7h',
        deck: '4d 9c',
      });
      const { state: next, events } = drawCard(state, 0);

      expect(handOf(next, 0)).toEqual(cards('2d 9c'));
      expect(next.deck).toEqual(cards('4d'));
      expect(next.checkedCard).toBeNull();
      expect(next.currentSeat).toBe(1);
      expect(events).toEqual([{ type: 'drew', seat: 0, count: 1 }]);
    });

    it('lets the player decide when the drawn card can be played', () => {
      const state = makeState({
        hands: { 0: '2d', 1: '2c' },
        pile: '7h',
        deck: '4d 9h',
      });
      const { state: next } = drawCard(state, 0);

      expect(next.checkedCard).toEqual(card('9h'));
      expect(next.currentSeat).toBe(0);
      expect(handOf(next, 0)).toEqual(cards('2d 9h'));
    });

    it('lets the player play the drawn card', () => {
      const state = makeState({
        hands: { 0: '2d', 1: '2c' },
        pile: '7h',
        deck: '4d 9h',
      });
      const drawn = drawCard(state, 0).state;
      const { state: next } = playCards(drawn, 0, cards('9h'));

      expect(topCard(next)).toEqual(card('9h'));
      expect(handOf(next, 0)).toEqual(cards('2d'));
      expect(next.currentSeat).toBe(1);
    });

    it('lets the player keep the drawn card instead', () => {
      const state = makeState({
        hands: { 0: '2d', 1: '2c' },
        pile: '7h',
        deck: '4d 9h',
      });
      const drawn = drawCard(state, 0).state;
      const { state: next } = keepDrawnCard(drawn, 0);

      expect(handOf(next, 0)).toEqual(cards('2d 9h'));
      expect(next.checkedCard).toBeNull();
      expect(next.currentSeat).toBe(1);
      expect(topCard(next)).toEqual(card('7h'));
    });

    it('is allowed even when the player holds a playable card', () => {
      const state = makeState({
        hands: { 0: '7c', 1: '2c' },
        pile: '7h',
        deck: '4d 9c',
      });
      expect(handOf(drawCard(state, 0).state, 0)).toEqual(cards('7c 9c'));
    });

    it('keeps the hand sorted', () => {
      const state = makeState({
        hands: { 0: '2d kc', 1: '2c' },
        pile: '7h',
        deck: '9c 5s',
      });
      expect(handOf(drawCard(state, 0).state, 0)).toEqual(cards('2d 5s kc'));
    });
  });

  describe('while a jack’s demand is active', () => {
    const facingDemand = (deck: string) =>
      makeState({
        hands: { 0: '2d', 1: '2c' },
        pile: '9c',
        demand: { rank: '7', until: 1 },
        deck,
      });

    it('lets the player play a drawn card of the demanded rank', () => {
      const { state } = drawCard(facingDemand('4d 7d'), 0);
      expect(state.checkedCard).toEqual(card('7d'));
    });

    it('ends the turn for a card that only matches the pile', () => {
      const { state } = drawCard(facingDemand('4d 9h'), 0);
      expect(state.checkedCard).toBeNull();
      expect(state.currentSeat).toBe(1);
    });

    it('does not extend the demand', () => {
      const { state } = drawCard(facingDemand('4d 9h'), 0);
      expect(state.demand).toBeNull();
    });
  });

  describe('when a penalty is owed', () => {
    it('takes the whole penalty if the first card does not help', () => {
      const state = makeState({
        hands: { 0: '9s', 1: '2c' },
        pile: '2h',
        penalty: 2,
        deck: '4d 5d',
      });
      const { state: next, events } = drawCard(state, 0);

      expect(handOf(next, 0)).toEqual(cards('4d 5d 9s'));
      expect(next.penalty).toBe(0);
      expect(next.currentSeat).toBe(1);
      expect(events).toEqual([
        { type: 'drew', seat: 0, count: 1 },
        { type: 'drew', seat: 0, count: 1 },
      ]);
    });

    it('lets the player answer with a drawn battle card, and keeps the penalty pending', () => {
      const state = makeState({
        hands: { 0: '9s', 1: '2c' },
        pile: '2h',
        penalty: 2,
        deck: '4d 3h',
      });
      const { state: next } = drawCard(state, 0);

      expect(next.checkedCard).toEqual(card('3h'));
      expect(next.penalty).toBe(2);
      expect(next.currentSeat).toBe(0);
      expect(handOf(next, 0)).toEqual(cards('3h 9s'));
    });

    it('passes the battle on when that card is played', () => {
      const state = makeState({
        hands: { 0: '9s', 1: '2c' },
        pile: '2h',
        penalty: 2,
        deck: '4d 3h',
      });
      const drawn = drawCard(state, 0).state;
      const { state: next } = playCards(drawn, 0, cards('3h'));

      expect(next.penalty).toBe(5);
      expect(next.currentSeat).toBe(1);
      expect(handOf(next, 0)).toEqual(cards('9s'));
    });

    it('takes the rest of the penalty if that card is kept instead', () => {
      const state = makeState({
        hands: { 0: '9s', 1: '2c' },
        pile: '2h',
        penalty: 2,
        deck: '4d 3h',
      });
      const drawn = drawCard(state, 0).state;
      const { state: next } = keepDrawnCard(drawn, 0);

      expect(handOf(next, 0)).toEqual(cards('3h 4d 9s'));
      expect(next.penalty).toBe(0);
      expect(next.currentSeat).toBe(1);
    });

    it('draws five cards in total for a battle king', () => {
      const state = makeState({
        hands: { 0: '9s', 1: '2c' },
        pile: 'kh',
        penalty: 5,
        deck: '6c 7c 8c 9c 10c 6d',
      });
      const { state: next } = drawCard(state, 0);

      expect(handOf(next, 0)).toHaveLength(6);
      expect(next.deck).toHaveLength(1);
      expect(next.penalty).toBe(0);
    });
  });

  describe('when the deck runs low', () => {
    it('recycles the pile, keeping its top card, and keeps drawing', () => {
      const state = makeState({
        hands: { 0: '9s', 1: '2c' },
        pile: '5h 6h 7h 2h',
        penalty: 3,
        deck: '9c',
      });
      const { state: next, events } = drawCard(state, 0, seededRng(1));

      expect(events).toContainEqual({ type: 'reshuffled' });
      expect(handOf(next, 0)).toHaveLength(4);
      expect(next.pile).toEqual(cards('2h'));
      expect(next.deck).toHaveLength(1);
      // Nothing was lost or duplicated
      const everyCard = [...handOf(next, 0), ...next.deck, ...next.pile];
      expect(new Set(everyCard.map((c) => `${c.rank}${c.suit}`)).size).toBe(
        everyCard.length,
      );
    });

    it('draws what is left when the pile has nothing to recycle', () => {
      const state = makeState({
        hands: { 0: '9s', 1: '2c' },
        pile: 'kh',
        penalty: 5,
        deck: '6c 7c',
      });
      const { state: next } = drawCard(state, 0);

      expect(handOf(next, 0)).toHaveLength(3);
      expect(next.deck).toEqual([]);
      expect(next.currentSeat).toBe(1);
    });

    it('simply ends the turn when there is nothing to draw at all', () => {
      const state = makeState({
        hands: { 0: '9s', 1: '2c' },
        pile: '2h',
        penalty: 2,
        deck: '',
      });
      const { state: next } = drawCard(state, 0);

      expect(handOf(next, 0)).toEqual(cards('9s'));
      expect(next.penalty).toBe(0);
      expect(next.currentSeat).toBe(1);
    });
  });

  describe('what is rejected', () => {
    const state = makeState({
      hands: { 0: '2d', 1: '2c' },
      pile: '7h',
      deck: '4d 9h',
    });

    it('drawing out of turn', () => {
      expect(illegalCode(() => drawCard(state, 1))).toBe('NOT_YOUR_TURN');
    });

    it('drawing after the game is over', () => {
      const over = { ...state, status: 'finished' as const };
      expect(illegalCode(() => drawCard(over, 0))).toBe('GAME_OVER');
    });

    it('drawing a second time before deciding on the first', () => {
      const drawn = drawCard(state, 0).state;
      expect(illegalCode(() => drawCard(drawn, 0))).toBe('ALREADY_DRAWN');
    });

    it('drawing instead of answering or accepting a 4', () => {
      const facingFour = makeState({
        hands: { 0: '2d', 1: '2c' },
        pile: '4h',
        pendingSkips: 1,
      });
      expect(illegalCode(() => drawCard(facingFour, 0))).toBe(
        'MUST_ANSWER_WAIT',
      );
    });

    it('keeping a card when none was drawn', () => {
      expect(illegalCode(() => keepDrawnCard(state, 0))).toBe('NOTHING_DRAWN');
    });

    it('keeping a drawn card out of turn', () => {
      const drawn = drawCard(state, 0).state;
      expect(illegalCode(() => keepDrawnCard(drawn, 1))).toBe('NOT_YOUR_TURN');
    });
  });

  it('does not change the state it was given', () => {
    const state = makeState({
      hands: { 0: '9s', 1: '2c' },
      pile: '5h 6h 2h',
      penalty: 2,
      deck: '4d',
    });
    const before = structuredClone(state);
    drawCard(state, 0, seededRng(1));
    expect(state).toEqual(before);
  });
});
