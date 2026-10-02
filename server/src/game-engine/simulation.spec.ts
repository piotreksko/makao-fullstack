import { seededRng } from '../../test/helpers/game-state.js';
import { NEUTRAL_RANKS, SUITS, type Card, type Rng } from './cards.js';
import {
  createGame,
  drawCard,
  getLegalCards,
  keepDrawnCard,
  playCards,
  waitTurns,
} from './engine.js';
import type { GameState, Outcome } from './game.types.js';

const MAX_ACTIONS = 4000;

function randomAction(state: GameState, rng: Rng): Outcome {
  const seat = state.currentSeat;
  const hand = state.players.find((p) => p.seat === seat)!.hand;
  const legal = getLegalCards(state, seat);
  const pick = <T>(items: T[]): T => items[Math.floor(rng() * items.length)];
  const choice = {
    suit: pick([...SUITS]),
    demand: rng() < 0.3 ? null : pick([...NEUTRAL_RANKS]),
  };

  // Several cards of one rank may be played together, the legal one first
  const play = (first: Card): Outcome => {
    const others = hand.filter(
      (c) => c.rank === first.rank && c.suit !== first.suit,
    );
    const extra = others.slice(0, Math.floor(rng() * (others.length + 1)));
    return playCards(state, seat, [first, ...extra], choice);
  };

  if (state.pendingSkips > 0) {
    return legal.length > 0 && rng() < 0.7
      ? play(pick(legal))
      : waitTurns(state, seat);
  }
  if (state.checkedCard) {
    return legal.length > 0 && rng() < 0.6
      ? playCards(state, seat, [state.checkedCard], choice)
      : keepDrawnCard(state, seat, rng);
  }
  if (legal.length > 0 && rng() < 0.75) return play(pick(legal));
  return drawCard(state, seat, rng);
}

// Returns a description of the first broken rule, or null if all is well
function brokenInvariant(state: GameState): string | null {
  const everyCard = [
    ...state.players.flatMap((p) => p.hand),
    ...state.deck,
    ...state.pile,
  ];
  if (everyCard.length !== 52) return `${everyCard.length} cards in play`;
  if (new Set(everyCard.map((c) => `${c.rank}${c.suit}`)).size !== 52) {
    return 'a card is duplicated';
  }
  if (state.pile.length === 0) return 'the pile is empty';
  if (state.penalty > 0 && state.pendingSkips > 0) {
    return 'a penalty and a wait are pending at once';
  }

  const current = state.players.find((p) => p.seat === state.currentSeat);
  if (!current) return 'the turn is with a seat that is not playing';
  if (state.status === 'playing' && current.place !== null) {
    return 'the turn is with a player who has finished';
  }
  if (state.status === 'playing' && current.hand.length === 0) {
    return 'the turn is with a player who has no cards';
  }
  if (
    state.checkedCard &&
    !current.hand.some(
      (c) =>
        c.rank === state.checkedCard!.rank &&
        c.suit === state.checkedCard!.suit,
    )
  ) {
    return 'the drawn card is not in the current hand';
  }
  if (state.ranking.length !== state.players.filter((p) => p.place).length) {
    return 'the ranking and the places disagree';
  }
  return null;
}

describe('random full games', () => {
  const results = { finished: 0, total: 0 };

  it.each([2, 3, 4])(
    'never break a rule with %i players, over many seeds',
    (playerCount) => {
      const seats = Array.from({ length: playerCount }, (_, i) => i * 2);

      for (let seed = 1; seed <= 120; seed++) {
        const rng = seededRng(seed * 7919 + playerCount);
        let state = createGame(seats, rng);
        let actions = 0;

        while (state.status === 'playing' && actions < MAX_ACTIONS) {
          state = randomAction(state, rng).state;
          actions++;

          const problem = brokenInvariant(state);
          if (problem) {
            throw new Error(
              `Seed ${seed}, ${playerCount} players, action ${actions}: ${problem}`,
            );
          }
        }

        results.total++;
        if (state.status === 'finished') {
          results.finished++;
          expect(state.ranking).toHaveLength(playerCount);
          expect(new Set(state.ranking).size).toBe(playerCount);
        }
      }
    },
  );

  it('almost always ends in a finished game', () => {
    expect(results.total).toBe(360);
    expect(results.finished / results.total).toBeGreaterThan(0.9);
  });
});
