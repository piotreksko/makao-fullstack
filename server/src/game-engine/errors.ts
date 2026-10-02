export type IllegalMoveCode =
  | 'GAME_OVER'
  | 'NOT_YOUR_TURN'
  | 'NO_CARDS'
  | 'CARD_NOT_IN_HAND'
  | 'MIXED_RANKS'
  | 'CARD_NOT_PLAYABLE'
  | 'CHOICE_REQUIRED'
  | 'INVALID_CHOICE'
  | 'MUST_PLAY_DRAWN_CARD'
  | 'NOTHING_DRAWN'
  | 'ALREADY_DRAWN'
  | 'MUST_ANSWER_WAIT'
  | 'NO_WAIT_PENDING';

export class IllegalMoveError extends Error {
  constructor(
    readonly code: IllegalMoveCode,
    message: string,
  ) {
    super(message);
    this.name = 'IllegalMoveError';
  }
}
