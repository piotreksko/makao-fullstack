// Mirrors the server's wire types (server/src/game-engine/{cards,view,game.types}.ts
// and server/src/rooms/rooms.types.ts); keep them in sync by hand.

export type Suit = "clubs" | "diamonds" | "spades" | "hearts";
export type Rank =
  | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10"
  | "jack" | "queen" | "king" | "ace";

export interface Card {
  rank: Rank;
  suit: Suit;
}

export interface JackDemand {
  rank: Rank;
  until: number;
}

export interface PlayerSummary {
  seat: number;
  cardCount: number;
  skipTurns: number;
  place: number | null;
}

export interface GameView {
  status: "playing" | "finished";
  currentSeat: number;
  ranking: number[];
  you: {
    seat: number;
    hand: Card[];
    legalCards: Card[];
    drawnCard: Card | null;
  } | null;
  players: PlayerSummary[];
  deckCount: number;
  pile: Card[];
  pileCount: number;
  penalty: number;
  pendingSkips: number;
  demand: JackDemand | null;
  chosenSuit: Suit | null;
  hasDrawn: boolean;
}

export type GameEvent =
  | { type: "played"; seat: number; cards: Card[] }
  | { type: "drew"; seat: number; count: number }
  | { type: "waited"; seat: number; turns: number }
  | { type: "reshuffled" }
  | { type: "macao"; seat: number }
  | { type: "finished"; seat: number; place: number }
  | { type: "gameOver"; ranking: number[] };

export interface PlayChoice {
  suit?: Suit;
  demand?: Rank | null;
}

export type RoomStatus = "waiting" | "in_progress" | "finished";
export type RoomVisibility = "public" | "private";

export interface RoomPlayerView {
  seat: number;
  isBot: boolean;
  isReady: boolean;
  user: { id: string; displayName: string } | null;
}

export interface RoomView {
  id: string;
  visibility: RoomVisibility;
  status: RoomStatus;
  maxPlayers: number;
  inviteCode: string | null;
  host: { id: string; displayName: string };
  players: RoomPlayerView[];
  createdAt: string;
}

export interface User {
  id: string;
  displayName: string;
}

export interface StatsFields {
  totalMoves: number;
  totalPlayerWins: number;
  totalComputerWins: number;
  totalMacaoCalls: number;
}
export type StatName = keyof StatsFields;
