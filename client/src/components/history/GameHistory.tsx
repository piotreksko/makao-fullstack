import { useState, type FormEvent } from "react";
import {
  CognitoError,
  getAccessToken,
  isCognitoConfigured,
  signIn,
  signOut
} from "../../services/cognitoAuth";
import {
  fetchGames,
  HistoryApiError,
  isHistoryApiConfigured,
  type GameRecord
} from "../../services/gameHistoryApi";

const inputClass =
  "tw:block tw:w-full tw:rounded-lg tw:border tw:border-slate-300 tw:bg-white tw:px-3 tw:py-2 tw:text-slate-900 tw:shadow-sm tw:outline-none tw:focus:border-emerald-600 tw:focus:ring-2 tw:focus:ring-emerald-600/30";
const buttonClass =
  "tw:cursor-pointer tw:rounded-md tw:border-0 tw:bg-slate-700 tw:px-4 tw:py-2 tw:font-semibold tw:text-white tw:hover:bg-slate-800 tw:disabled:cursor-not-allowed tw:disabled:opacity-60";

// Game history from the AWS slice (Cognito -> API Gateway -> Lambda -> DynamoDB).
// Renders nothing unless the VITE_* settings are present, so the rest of the
// app is unaffected when the AWS stack isn't configured.
const GameHistory = () => {
  const [signedIn, setSignedIn] = useState(() => getAccessToken() !== null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [winner, setWinner] = useState("");
  const [games, setGames] = useState<GameRecord[]>([]);
  const [nextToken, setNextToken] = useState<string | undefined>();
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isCognitoConfigured || !isHistoryApiConfigured) return null;

  const handleError = (err: unknown) => {
    if (err instanceof HistoryApiError && err.status === 401) {
      setSignedIn(false);
      setError("Session expired, sign in again.");
    } else if (err instanceof CognitoError && err.code === "NotAuthorizedException") {
      setError("Wrong email or password.");
    } else {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signIn(email, password);
      setPassword("");
      setSignedIn(true);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const loadPage = async (token?: string) => {
    setLoading(true);
    setError(null);
    try {
      const page = await fetchGames(winner.trim(), token);
      setGames(prev => (token ? [...prev, ...page.games] : page.games));
      setNextToken(page.nextToken);
      setSearched(true);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (winner.trim()) loadPage();
  };

  const handleSignOut = () => {
    signOut();
    setSignedIn(false);
    setGames([]);
    setNextToken(undefined);
    setSearched(false);
  };

  return (
    <section className="tw:mt-8 tw:border-t tw:border-slate-200 tw:pt-6">
      <h2 className="tw:text-xl tw:font-bold">Game history (AWS)</h2>

      {error && (
        <div
          role="alert"
          className="tw:mb-4 tw:rounded-lg tw:border tw:border-red-200 tw:bg-red-50 tw:px-4 tw:py-3 tw:text-sm tw:text-red-700"
        >
          {error}
        </div>
      )}

      {!signedIn ? (
        <form onSubmit={handleSignIn} className="tw:flex tw:flex-col tw:gap-3">
          <input
            type="email"
            aria-label="Email"
            placeholder="Email"
            autoComplete="username"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className={inputClass}
          />
          <input
            type="password"
            aria-label="Password"
            placeholder="Password"
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className={inputClass}
          />
          <button type="submit" disabled={loading || !email || !password} className={buttonClass}>
            {loading ? "Signing in..." : "Sign in with Cognito"}
          </button>
        </form>
      ) : (
        <>
          <form onSubmit={handleSearch} className="tw:flex tw:gap-2">
            <input
              aria-label="Winner"
              placeholder="Winner name"
              value={winner}
              onChange={e => setWinner(e.target.value)}
              className={inputClass}
            />
            <button type="submit" disabled={loading || !winner.trim()} className={buttonClass}>
              Search
            </button>
            <button type="button" onClick={handleSignOut} className={buttonClass}>
              Sign out
            </button>
          </form>

          {searched && games.length === 0 && (
            <p className="tw:mt-3 tw:text-sm tw:text-slate-500">No games found.</p>
          )}

          <ul className="tw:mt-3 tw:list-none tw:p-0">
            {games.map(game => (
              <li key={game.gameId}>
                {new Date(game.finishedAt).toLocaleString()}: {game.winner} won ({game.gameId})
              </li>
            ))}
          </ul>

          {nextToken && (
            <button
              type="button"
              disabled={loading}
              onClick={() => loadPage(nextToken)}
              className={`${buttonClass} tw:mt-2`}
            >
              {loading ? "Loading..." : "Load more"}
            </button>
          )}
        </>
      )}
    </section>
  );
};

export default GameHistory;
