import {
  card,
  cards,
  handOf,
  illegalCode,
  makeState,
} from '../../test/helpers/game-state.js';
import { playCards } from './engine.js';
import type { PlayChoice } from './game.types.js';
import { topCard } from './rules.js';

type State = ReturnType<typeof makeState>;

const play = (state: State, seat: number, codes: string, choice?: PlayChoice) =>
  playCards(state, seat, cards(codes), choice);

describe('playing cards: what is rejected', () => {
  const state = makeState({
    hands: { 0: '7c 9h jh ah 8s', 1: '7d 2c' },
    pile: '7h',
  });

  it('rejects a player whose turn it is not', () => {
    expect(illegalCode(() => play(state, 1, '7d'))).toBe('NOT_YOUR_TURN');
  });

  it('rejects a seat that is not in the game', () => {
    expect(illegalCode(() => play(state, 9, '7d'))).toBe('NOT_YOUR_TURN');
  });

  it('rejects moves once the game is over', () => {
    const over = { ...state, status: 'finished' as const };
    expect(illegalCode(() => play(over, 0, '7c'))).toBe('GAME_OVER');
  });

  it('rejects playing no cards', () => {
    expect(illegalCode(() => play(state, 0, ''))).toBe('NO_CARDS');
  });

  it('rejects a card the player does not hold', () => {
    expect(illegalCode(() => play(state, 0, '7d'))).toBe('CARD_NOT_IN_HAND');
  });

  it('rejects playing the same card twice', () => {
    expect(illegalCode(() => play(state, 0, '7c 7c'))).toBe('CARD_NOT_IN_HAND');
  });

  it('rejects cards of different ranks played together', () => {
    expect(illegalCode(() => play(state, 0, '7c 9h'))).toBe('MIXED_RANKS');
  });

  it('rejects a card that does not fit the top card', () => {
    const noFit = makeState({ hands: { 0: '9d 7c' }, pile: '7h' });
    expect(illegalCode(() => play(noFit, 0, '9d'))).toBe('CARD_NOT_PLAYABLE');
  });

  it('rejects an ace without a chosen suit', () => {
    expect(illegalCode(() => play(state, 0, 'ah'))).toBe('CHOICE_REQUIRED');
  });

  it('rejects a jack without a demand decision', () => {
    expect(illegalCode(() => play(state, 0, 'jh'))).toBe('CHOICE_REQUIRED');
  });

  it('rejects a suit that does not exist', () => {
    const bad = { suit: 'stars' } as unknown as PlayChoice;
    expect(illegalCode(() => play(state, 0, 'ah', bad))).toBe('INVALID_CHOICE');
  });

  it.each(['2', 'king', 'ace', 'jack', 'nonsense'])(
    'rejects demanding %s with a jack',
    (rank) => {
      const bad = { demand: rank } as unknown as PlayChoice;
      expect(illegalCode(() => play(state, 0, 'jh', bad))).toBe(
        'INVALID_CHOICE',
      );
    },
  );

  it('rejects anything but the drawn card right after drawing', () => {
    const drawn = makeState({
      hands: { 0: '7c 7h' },
      pile: '7s',
      checkedCard: card('7h'),
    });
    expect(illegalCode(() => play(drawn, 0, '7c'))).toBe(
      'MUST_PLAY_DRAWN_CARD',
    );
    expect(illegalCode(() => play(drawn, 0, '7h 7c'))).toBe(
      'MUST_PLAY_DRAWN_CARD',
    );
  });

  it('does not change the state it was given', () => {
    const before = structuredClone(state);
    play(state, 0, '7c');
    expect(state).toEqual(before);
  });
});

describe('playing cards: what happens', () => {
  it('moves the card from the hand to the top of the pile', () => {
    const state = makeState({ hands: { 0: '7c 9s 8s', 1: '2c' }, pile: '7h' });
    const { state: next } = play(state, 0, '7c');

    expect(handOf(next, 0)).toEqual(cards('9s 8s'));
    expect(topCard(next)).toEqual(card('7c'));
    expect(next.pile).toHaveLength(2);
  });

  it('puts several same-rank cards on the pile in the order played', () => {
    const state = makeState({ hands: { 0: '7h 7c 9s', 1: '2c' }, pile: '7d' });
    const { state: next } = play(state, 0, '7h 7c');

    expect(next.pile.slice(-2)).toEqual(cards('7h 7c'));
    expect(topCard(next)).toEqual(card('7c'));
    expect(handOf(next, 0)).toEqual(cards('9s'));
  });

  it('reports what was played', () => {
    const state = makeState({ hands: { 0: '7c 9s', 1: '2c' }, pile: '7h' });
    const { events } = play(state, 0, '7c');
    expect(events[0]).toEqual({ type: 'played', seat: 0, cards: cards('7c') });
  });

  it('warns "macao" when a player is left with one card, and not otherwise', () => {
    const one = makeState({ hands: { 0: '7c 9s', 1: '2c 3c' }, pile: '7h' });
    expect(play(one, 0, '7c').events).toContainEqual({
      type: 'macao',
      seat: 0,
    });

    const two = makeState({ hands: { 0: '7c 9s 8s', 1: '2c' }, pile: '7h' });
    expect(play(two, 0, '7c').events.some((e) => e.type === 'macao')).toBe(
      false,
    );
  });

  it('does nothing special for a card without an effect', () => {
    const state = makeState({ hands: { 0: '8h 9s', 1: '2c' }, pile: '7h' });
    const { state: next } = play(state, 0, '8h');
    expect(next).toMatchObject({
      penalty: 0,
      pendingSkips: 0,
      demand: null,
      chosenSuit: null,
    });
  });

  describe('battle cards', () => {
    it.each([
      ['2h', 2],
      ['3h', 3],
      ['kh', 5],
    ])('%s adds %i to the penalty', (code, penalty) => {
      const state = makeState({
        hands: { 0: `${code} 9s`, 1: '2c' },
        pile: '7h',
      });
      expect(play(state, 0, code).state.penalty).toBe(penalty);
    });

    it('a king of spades adds 5 as well', () => {
      const state = makeState({ hands: { 0: 'ks 9s', 1: '2c' }, pile: 'ks' });
      expect(play(state, 0, 'ks').state.penalty).toBe(5);
    });

    it('several battle cards add up', () => {
      const state = makeState({
        hands: { 0: '2h 2c 9s', 1: '2d' },
        pile: '7h',
      });
      expect(play(state, 0, '2h 2c').state.penalty).toBe(4);
    });

    it('stacks on a penalty that is already pending', () => {
      const state = makeState({
        hands: { 0: '3h 9s', 1: '2c' },
        pile: '2h',
        penalty: 2,
      });
      expect(play(state, 0, '3h').state.penalty).toBe(5);
    });

    it('a king of diamonds or clubs cancels a pending penalty', () => {
      for (const code of ['kd', 'kc']) {
        const state = makeState({
          hands: { 0: `${code} 9s`, 1: '2c' },
          pile: 'kh',
          penalty: 5,
        });
        expect(play(state, 0, code).state.penalty).toBe(0);
      }
    });

    it('cancelling and adding are applied in the order the cards are played', () => {
      const hand = 'kd kh kc';
      const cancelFirst = makeState({
        hands: { 0: hand, 1: '2c' },
        pile: 'ks',
        penalty: 5,
      });
      expect(play(cancelFirst, 0, 'kd kh').state.penalty).toBe(5);
      expect(play(cancelFirst, 0, 'kh kd').state.penalty).toBe(0);
    });
  });

  describe('fours', () => {
    it('make the next player wait', () => {
      const state = makeState({ hands: { 0: '4h 9s', 1: '2c' }, pile: '7h' });
      expect(play(state, 0, '4h').state.pendingSkips).toBe(1);
    });

    it('add up when played together', () => {
      const state = makeState({
        hands: { 0: '4h 4c 9s', 1: '2c' },
        pile: '7h',
      });
      expect(play(state, 0, '4h 4c').state.pendingSkips).toBe(2);
    });

    it('stack on a wait that is already pending', () => {
      const state = makeState({
        hands: { 0: '4h 9s', 1: '2c' },
        pile: '4d',
        pendingSkips: 1,
      });
      expect(play(state, 0, '4h').state.pendingSkips).toBe(2);
    });
  });

  describe('jacks', () => {
    const state = makeState({ hands: { 0: 'jh 9s', 1: '2c' }, pile: '7h' });

    it('demand a rank until the turn returns to the jack’s owner', () => {
      const { state: next } = play(state, 0, 'jh', { demand: '7' });
      expect(next.demand).toEqual({ rank: '7', until: 0 });
    });

    it('can demand nothing', () => {
      const { state: next } = play(state, 0, 'jh', { demand: null });
      expect(next.demand).toBeNull();
    });

    it('replace a demand that was already active', () => {
      const active = makeState({
        hands: { 0: 'jd 9s', 1: '2c' },
        pile: '9c',
        demand: { rank: '7', until: 1 },
      });
      const { state: next } = play(active, 0, 'jd', { demand: '10' });
      expect(next.demand).toEqual({ rank: '10', until: 0 });
    });
  });

  describe('aces', () => {
    const state = makeState({ hands: { 0: 'ah 9s', 1: '2c' }, pile: '7h' });

    it('choose the suit that must be played next', () => {
      const { state: next } = play(state, 0, 'ah', { suit: 'clubs' });
      expect(next.chosenSuit).toBe('clubs');
    });

    it('stop mattering once another card is on top', () => {
      const afterAce = play(state, 0, 'ah', { suit: 'clubs' }).state;
      const withClub = {
        ...afterAce,
        players: afterAce.players.map((p) =>
          p.seat === 1 ? { ...p, hand: cards('2c 5c') } : p,
        ),
      };
      const { state: next } = play(withClub, 1, '2c');
      expect(next.chosenSuit).toBeNull();
    });
  });

  it('a player who plays their last card needs no choice for an ace or jack', () => {
    const ace = makeState({ hands: { 0: 'ah', 1: '2c' }, pile: '7h' });
    expect(() => play(ace, 0, 'ah')).not.toThrow();

    const jack = makeState({ hands: { 0: 'jh', 1: '2c' }, pile: '7h' });
    expect(() => play(jack, 0, 'jh')).not.toThrow();
  });

  it('clears the drawn-card marker once it is played', () => {
    const drawn = makeState({
      hands: { 0: '7c 9s', 1: '2c' },
      pile: '7h',
      checkedCard: card('7c'),
    });
    expect(play(drawn, 0, '7c').state.checkedCard).toBeNull();
  });
});
