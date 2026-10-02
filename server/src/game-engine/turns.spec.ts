import {
  cards,
  handOf,
  illegalCode,
  makeState,
} from '../../test/helpers/game-state.js';
import { playCards, waitTurns } from './engine.js';
import type { PlayChoice } from './game.types.js';

type State = ReturnType<typeof makeState>;

const play = (state: State, seat: number, codes: string, choice?: PlayChoice) =>
  playCards(state, seat, cards(codes), choice).state;

describe('turn order', () => {
  it('passes the turn to the next seat, and wraps around', () => {
    const start = makeState({
      hands: { 0: '7c 9s', 1: '7d 9d', 2: '7s 9h' },
      pile: '7h',
    });
    const afterFirst = play(start, 0, '7c');
    expect(afterFirst.currentSeat).toBe(1);
    const afterSecond = play(afterFirst, 1, '7d');
    expect(afterSecond.currentSeat).toBe(2);
    expect(play(afterSecond, 2, '7s').currentSeat).toBe(0);
  });

  it('follows seat numbers, gaps included', () => {
    const state = makeState({
      hands: { 0: '7c 9s', 2: '7d 9d', 3: '7s 9h' },
      pile: '7h',
      currentSeat: 3,
    });
    expect(play(state, 3, '7s').currentSeat).toBe(0);
  });

  it('passes over a player who has finished', () => {
    const state = makeState({
      hands: { 0: '7c 9s', 1: '', 2: '7d 9d' },
      pile: '7h',
      ranking: [1],
    });
    state.players[1].place = 1;
    expect(play(state, 0, '7c').currentSeat).toBe(2);
  });

  it('passes over a player who is still serving skipped turns', () => {
    const state = makeState({
      hands: { 0: '7c 9s', 1: '7d 9d', 2: '7s 9h' },
      pile: '7h',
      skips: { 1: 1 },
    });
    const next = play(state, 0, '7c');
    expect(next.currentSeat).toBe(2);
    expect(next.players[1].skipTurns).toBe(0);
  });
});

describe('waiting after a 4', () => {
  const facingFour = (extra: object = {}) =>
    makeState({
      hands: { 0: '7h 9s', 1: '9c 8c' },
      pile: '4h',
      currentSeat: 1,
      pendingSkips: 1,
      ...extra,
    });

  it('skips the waiting player’s turn and clears the wait', () => {
    const { state, events } = waitTurns(facingFour(), 1);
    expect(state.currentSeat).toBe(0);
    expect(state.pendingSkips).toBe(0);
    expect(state.players[1].skipTurns).toBe(0);
    expect(events).toEqual([{ type: 'waited', seat: 1, turns: 1 }]);
  });

  it('gives the turn to the next player in a bigger game', () => {
    const state = makeState({
      hands: { 0: '7c', 1: '9c', 2: '8c' },
      pile: '4h',
      currentSeat: 1,
      pendingSkips: 1,
    });
    expect(waitTurns(state, 1).state.currentSeat).toBe(2);
  });

  it('makes a player wait out every 4 that was stacked on them', () => {
    const afterWait = waitTurns(facingFour({ pendingSkips: 2 }), 1).state;
    expect(afterWait.players[1].skipTurns).toBe(1);
    expect(afterWait.currentSeat).toBe(0);

    // Seat 0 plays, but seat 1 still has a turn to skip, so seat 0 goes again
    const next = play(afterWait, 0, '7h');
    expect(next.currentSeat).toBe(0);
    expect(next.players[1].skipTurns).toBe(0);
  });

  it('can be passed on by answering with another 4', () => {
    const start = makeState({
      hands: { 0: '4h 9s', 1: '4c 8c' },
      pile: '7h',
    });
    const afterFirst = play(start, 0, '4h');
    expect(afterFirst).toMatchObject({ currentSeat: 1, pendingSkips: 1 });

    const afterSecond = play(afterFirst, 1, '4c');
    expect(afterSecond).toMatchObject({ currentSeat: 0, pendingSkips: 2 });

    const afterWait = waitTurns(afterSecond, 0).state;
    expect(afterWait.players[0].skipTurns).toBe(1);
    expect(afterWait.currentSeat).toBe(1);
  });

  it('cannot be requested when nothing is pending', () => {
    const state = makeState({ hands: { 0: '7c', 1: '9c' }, pile: '7h' });
    expect(illegalCode(() => waitTurns(state, 0))).toBe('NO_WAIT_PENDING');
  });

  it('cannot be done out of turn', () => {
    expect(illegalCode(() => waitTurns(facingFour(), 0))).toBe('NOT_YOUR_TURN');
  });
});

describe('a jack’s demand', () => {
  it('lasts one round in a two-player game', () => {
    const start = makeState({
      hands: { 0: 'jh 9c 8s', 1: '7c 9d' },
      pile: '7h',
    });
    const afterJack = play(start, 0, 'jh', { demand: '7' });
    expect(afterJack.demand).toEqual({ rank: '7', until: 0 });
    expect(afterJack.currentSeat).toBe(1);

    const afterAnswer = play(afterJack, 1, '7c');
    expect(afterAnswer.currentSeat).toBe(0);
    expect(afterAnswer.demand).toBeNull();
  });

  it('lasts until the turn returns to the jack’s owner in a three-player game', () => {
    const start = makeState({
      hands: { 0: 'jh 9c 8s', 1: '7c 9d', 2: '7d 9s' },
      pile: '7h',
    });
    const afterJack = play(start, 0, 'jh', { demand: '7' });

    const afterSecond = play(afterJack, 1, '7c');
    expect(afterSecond.demand).toEqual({ rank: '7', until: 0 });
    expect(afterSecond.currentSeat).toBe(2);

    const afterThird = play(afterSecond, 2, '7d');
    expect(afterThird.demand).toBeNull();
    expect(afterThird.currentSeat).toBe(0);
  });

  it('can be answered with another jack, which starts a new demand', () => {
    const start = makeState({
      hands: { 0: 'jh 9c 8s', 1: 'jd 2c 4c' },
      pile: '7h',
    });
    const first = play(start, 0, 'jh', { demand: '7' });
    const second = play(first, 1, 'jd', { demand: '9' });
    expect(second.demand).toEqual({ rank: '9', until: 1 });
    expect(second.currentSeat).toBe(0);

    const third = play(second, 0, '9c');
    expect(third.demand).toBeNull();
    expect(third.currentSeat).toBe(1);
  });

  it('a jack with "no demand" leaves the game unrestricted', () => {
    const start = makeState({
      hands: { 0: 'jh 9c 8s', 1: '2c 4h' },
      pile: '7h',
    });
    const next = play(start, 0, 'jh', { demand: null });
    expect(next.demand).toBeNull();
  });

  it('still ends when its owner has already finished', () => {
    const start = makeState({
      hands: { 0: 'jh', 1: '7c 9c', 2: '7d 9d' },
      pile: '7h',
    });
    const afterJack = play(start, 0, 'jh', { demand: '7' });
    expect(afterJack.demand).toEqual({ rank: '7', until: 0 });

    const afterSecond = play(afterJack, 1, '7c');
    const afterThird = play(afterSecond, 2, '7d');
    expect(afterThird.demand).toBeNull();
    expect(afterThird.currentSeat).toBe(1);
  });
});

describe('finishing', () => {
  it('ends a two-player game as soon as one player runs out of cards', () => {
    const state = makeState({ hands: { 0: '7c', 1: '2c 3c' }, pile: '7h' });
    const { state: next, events } = playCards(state, 0, cards('7c'));

    expect(next.status).toBe('finished');
    expect(next.ranking).toEqual([0, 1]);
    expect(next.players.map((p) => p.place)).toEqual([1, 2]);
    expect(events).toContainEqual({ type: 'finished', seat: 0, place: 1 });
    expect(events).toContainEqual({ type: 'gameOver', ranking: [0, 1] });
  });

  it('accepts no more moves after that', () => {
    const state = makeState({ hands: { 0: '7c', 1: '7d 3c' }, pile: '7h' });
    const over = play(state, 0, '7c');
    expect(illegalCode(() => play(over, 1, '7d'))).toBe('GAME_OVER');
  });

  it('carries on with the rest of a three-player game', () => {
    const state = makeState({
      hands: { 0: '7c', 1: '7d 9d', 2: '2c 3c' },
      pile: '7h',
    });
    const first = playCards(state, 0, cards('7c'));
    expect(first.state.status).toBe('playing');
    expect(first.state.ranking).toEqual([0]);
    expect(first.state.currentSeat).toBe(1);
    expect(first.events).toContainEqual({
      type: 'finished',
      seat: 0,
      place: 1,
    });
    expect(first.events.some((e) => e.type === 'gameOver')).toBe(false);
  });

  it('ranks players in the order they finish, and the last one last', () => {
    const state = makeState({
      hands: { 0: '7c', 1: '7d', 2: '2c 3c' },
      pile: '7h',
    });
    const afterFirst = play(state, 0, '7c');
    const { state: over, events } = playCards(afterFirst, 1, cards('7d'));

    expect(over.status).toBe('finished');
    expect(over.ranking).toEqual([0, 1, 2]);
    expect(over.players.map((p) => p.place)).toEqual([1, 2, 3]);
    expect(events).toContainEqual({ type: 'gameOver', ranking: [0, 1, 2] });
  });

  it('never gives the turn back to a player who has finished', () => {
    const state = makeState({
      hands: { 0: '7c', 1: '7d 9d', 2: '7s 9s' },
      pile: '7h',
    });
    const afterFirst = play(state, 0, '7c');
    const afterSecond = play(afterFirst, 1, '7d');
    expect(play(afterSecond, 2, '7s').currentSeat).toBe(1);
  });

  it('lets a player finish on an ace or jack without choosing', () => {
    const state = makeState({
      hands: { 0: 'ah', 1: '2c 3c', 2: '4c 5c' },
      pile: '7h',
    });
    expect(() => play(state, 0, 'ah')).not.toThrow();
  });

  it('still hands the penalty of a final battle card to the next player', () => {
    const state = makeState({
      hands: { 0: '2h', 1: '9c 8c', 2: '9d 8d' },
      pile: '7h',
    });
    const next = play(state, 0, '2h');
    expect(next).toMatchObject({
      penalty: 2,
      currentSeat: 1,
      status: 'playing',
    });
    expect(handOf(next, 0)).toEqual([]);
  });
});
