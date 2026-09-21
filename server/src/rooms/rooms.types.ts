export enum RoomStatus {
  Waiting = 'waiting',
  InProgress = 'in_progress',
  Finished = 'finished',
}

export enum RoomVisibility {
  Public = 'public',
  Private = 'private',
}

export const MIN_SEATS = 2;
export const MAX_SEATS = 4;

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
  createdAt: Date;
}
