import { getAccessToken, signOut } from "./cognitoAuth";

const HISTORY_API_URL = import.meta.env.VITE_HISTORY_API_URL as string | undefined;

export const isHistoryApiConfigured = Boolean(HISTORY_API_URL);

export interface GameRecord {
  gameId: string;
  winner: string;
  finishedAt: string;
}

export interface GamesPage {
  games: GameRecord[];
  count: number;
  nextToken?: string;
}

export class HistoryApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// One page of a player's games, newest first. Pass the previous page's
// nextToken to get the following page; no nextToken in the result means done.
export const fetchGames = async (
  winner: string,
  nextToken?: string,
  limit = 10
): Promise<GamesPage> => {
  const token = getAccessToken();
  if (!HISTORY_API_URL) throw new HistoryApiError(0, "History API is not configured");
  if (!token) throw new HistoryApiError(401, "Not signed in");

  const query = new URLSearchParams({ winner, limit: String(limit) });
  if (nextToken) query.set("nextToken", nextToken);

  const res = await fetch(`${HISTORY_API_URL}/games?${query}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    // The access token lasts an hour; the API Gateway authorizer answers 401 after that
    if (res.status === 401) signOut();
    const body = await res.json().catch(() => null);
    throw new HistoryApiError(res.status, body?.error ?? res.statusText);
  }

  return res.json() as Promise<GamesPage>;
};
