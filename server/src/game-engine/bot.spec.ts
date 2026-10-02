import {
  card,
  cards,
  handOf,
  makeState,
  seededRng,
} from '../../test/helpers/game-state.js';
import { botMove } from './bot.js';
import { createGame, getLegalCards } from './engine.js';
import type { GameState } from './game.types.js';
import { topCard } from './rules.js';

describe('botMove', () => {
  it('plays a card that fits when it has one', () => {
    const state = makeState({ hands: { 0: '7c 9d', 1: '2c 3c' }, pile: '7h' });
    const { state: next } = botMove(state, seededRng(1));
    expect(topCard(next)).toEqual(card('7c'));
    expect(next.currentSeat).toBe(1);
  });

  it('draws when nothing fits', () => {
    const state = makeState({
      hands: { 0: '9d 8d', 1: '2c 3c' },
      pile: '7h',
      deck: '5s 6s',
    });
    const { state: next, events } = botMove(state, seededRng(1));
    expect(events[0]).toMatchObject({ type: 'drew', seat: 0 });
    expect(handOf(next, 0)).toHaveLength(3);
  });

  it('plays all cards of a rank together', () => {
    const state = makeState({
      hands: { 0: '7c 7d 9d', 1: '2c 3c' },
      pile: '7h',
    });
    const { state: next } = botMove(state, seededRng(1));
    expect(next.pile.slice(-2).map((c) => c.rank)).toEqual(['7', '7']);
    expect(handOf(next, 0)).toEqual(cards('9d'));
  });

  it('plays a drawn card that fits, on its own', () => {
    const state = makeState({
      hands: { 0: '9h 9d', 1: '2c 3c' },
      pile: '7h',
      checkedCard: card('9h'),
    });
    const { state: next } = botMove(state, seededRng(1));
    expect(topCard(next)).toEqual(card('9h'));
    expect(handOf(next, 0)).toEqual(cards('9d'));
  });

  it('answers a 4 with a 4, and waits when it has none', () => {
    const withFour = makeState({
      hands: { 0: '4c 9d', 1: '2c 3c' },
      pile: '4h',
      pendingSkips: 1,
    });
    expect(botMove(withFour, seededRng(1)).state.pendingSkips).toBe(2);

    const without = makeState({
      hands: { 0: '9d 8d', 1: '2c 3c' },
      pile: '4h',
      pendingSkips: 1,
    });
    const { state: next, events } = botMove(without, seededRng(1));
    expect(events).toEqual([{ type: 'waited', seat: 0, turns: 1 }]);
    expect(next.pendingSkips).toBe(0);
  });

  it('demands the rank it holds most of when it plays a jack', () => {
    const state = makeState({
      hands: { 0: 'jh 8c 8d 9s', 1: '2c 3c' },
      pile: '7h',
    });
    expect(botMove(state, seededRng(1)).state.demand).toEqual({
      rank: '8',
      until: 0,
    });
  });

  it('chooses the suit it holds most of when it plays an ace', () => {
    const state = makeState({
      hands: { 0: 'ah 8c 9c 2d', 1: '2c 3c' },
      pile: '7h',
    });
    expect(botMove(state, seededRng(1)).state.chosenSuit).toBe('clubs');
  });

  it('never chooses an illegal move, whatever the situation', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const rng = seededRng(seed);
      let state = createGame([0, 1, 2], rng);
      for (let step = 0; step < 60 && state.status === 'playing'; step++) {
        const seat = state.currentSeat;
        const before = getLegalCards(state, seat);
        // Any error thrown here is the bot cheating
        const outcome = botMove(state, rng);
        state = outcome.state;
        if (before.length === 0) {
          expect(outcome.events[0].type).toMatch(/drew|waited|reshuffled/);
        }
      }
    }
  });
});

describe('games played only by bots', () => {
  it.each([2, 3, 4])('end with %i players', (playerCount) => {
    let finished = 0;
    for (let seed = 1; seed <= 100; seed++) {
      const rng = seededRng(seed * 31 + playerCount);
      let state: GameState = createGame(
        Array.from({ length: playerCount }, (_, i) => i),
        rng,
      );
      for (let step = 0; step < 4000 && state.status === 'playing'; step++) {
        state = botMove(state, rng).state;
      }
      if (state.status === 'finished') finished++;
    }
    expect(finished).toBeGreaterThanOrEqual(95);
  });
});
