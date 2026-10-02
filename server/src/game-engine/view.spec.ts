import {
  card,
  cards,
  makeState,
  seededRng,
} from '../../test/helpers/game-state.js';
import { createGame } from './engine.js';
import { PILE_CARDS_SHOWN, buildGameView } from './view.js';

describe('buildGameView', () => {
  const state = makeState({
    hands: { 0: '7c 9h jd', 1: '2c 3c', 2: 'ks 4d 5d 6d' },
    pile: '5h 6h 7h 8h 9c 10c 2s 3s 4s 5s 7d',
    deck: '6c 7c 8c',
  });

  it('gives the viewer their own hand and the legal cards in it', () => {
    const view = buildGameView(state, 0);
    expect(view.you).toEqual({
      seat: 0,
      hand: cards('7c 9h jd'),
      legalCards: cards('7c jd'),
      drawnCard: null,
    });
  });

  it('never includes another player’s cards', () => {
    const json = JSON.stringify(buildGameView(state, 0));
    for (const secret of ['2c', '3c', 'ks', '4d', '5d', '6d'].map(card)) {
      expect(json).not.toContain(JSON.stringify(secret));
    }
    expect(JSON.stringify(buildGameView(state, 0).players)).not.toContain(
      'hand',
    );
  });

  it('shows how many cards everyone holds', () => {
    expect(buildGameView(state, 1).players).toEqual([
      { seat: 0, cardCount: 3, skipTurns: 0, place: null },
      { seat: 1, cardCount: 2, skipTurns: 0, place: null },
      { seat: 2, cardCount: 4, skipTurns: 0, place: null },
    ]);
  });

  it('gives no legal cards to a player whose turn it is not', () => {
    const view = buildGameView(state, 1);
    expect(view.you?.hand).toEqual(cards('2c 3c'));
    expect(view.you?.legalCards).toEqual([]);
  });

  it('shows the deck only as a count and the pile only near the top', () => {
    const view = buildGameView(state, 0);
    expect(view.deckCount).toBe(3);
    expect(view).not.toHaveProperty('deck');
    expect(view.pileCount).toBe(11);
    expect(view.pile).toHaveLength(PILE_CARDS_SHOWN);
    expect(view.pile.at(-1)).toEqual(card('7d'));
  });

  it('gives a viewer who is not playing no private information', () => {
    const view = buildGameView(state, null);
    expect(view.you).toBeNull();
    expect(view.players).toHaveLength(3);
  });

  it('shows the drawn card only to the player who drew it', () => {
    const drawn = makeState({
      hands: { 0: '7c 9h', 1: '2c' },
      pile: '7h',
      checkedCard: card('9h'),
    });
    expect(buildGameView(drawn, 0).you?.drawnCard).toEqual(card('9h'));
    expect(buildGameView(drawn, 1).you?.drawnCard).toBeNull();
    expect(buildGameView(drawn, 1).hasDrawn).toBe(true);
    expect(JSON.stringify(buildGameView(drawn, 1))).not.toContain('"9"');
  });

  it('carries the public rules state', () => {
    const view = buildGameView(
      makeState({
        hands: { 0: '7c', 1: '2c' },
        pile: '2h',
        penalty: 2,
        pendingSkips: 0,
        demand: { rank: '7', until: 1 },
        chosenSuit: 'hearts',
      }),
      0,
    );
    expect(view).toMatchObject({
      penalty: 2,
      demand: { rank: '7', until: 1 },
      chosenSuit: 'hearts',
      status: 'playing',
    });
  });

  it('does not let the view be used to change the game', () => {
    const view = buildGameView(state, 0);
    view.you!.hand.pop();
    view.pile.pop();
    expect(state.players[0].hand).toHaveLength(3);
    expect(state.pile).toHaveLength(11);
  });

  it('works for a freshly created game', () => {
    const fresh = createGame([0, 1, 2, 3], seededRng(4));
    const view = buildGameView(fresh, 2);
    expect(view.you?.hand).toHaveLength(5);
    expect(view.players.every((p) => p.cardCount === 5)).toBe(true);
    expect(view.deckCount).toBe(52 - 4 * 5 - 1);
  });
});
