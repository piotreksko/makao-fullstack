import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status });

// The services read import.meta.env when the module loads, so each test
// stubs the env first and imports fresh copies.
const load = async () => {
  vi.resetModules();
  vi.stubEnv("VITE_COGNITO_CLIENT_ID", "client123");
  vi.stubEnv("VITE_COGNITO_REGION", "eu-north-1");
  vi.stubEnv("VITE_HISTORY_API_URL", "https://api.example.com");
  const auth = await import("./cognitoAuth");
  const api = await import("./gameHistoryApi");
  return { auth, api };
};

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("cognitoAuth.signIn", () => {
  it("calls Cognito InitiateAuth and keeps the access token in memory", async () => {
    const { auth } = await load();
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    fetchMock.mockResolvedValue(
      jsonResponse(200, { AuthenticationResult: { AccessToken: "tok" } })
    );

    await auth.signIn("a@b.com", "pw");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://cognito-idp.eu-north-1.amazonaws.com/");
    expect(init.headers["X-Amz-Target"]).toBe("AWSCognitoIdentityProviderService.InitiateAuth");
    expect(JSON.parse(init.body)).toEqual({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: "client123",
      AuthParameters: { USERNAME: "a@b.com", PASSWORD: "pw" }
    });
    expect(auth.getAccessToken()).toBe("tok");
    expect(setItem).not.toHaveBeenCalled(); // never written to browser storage
    setItem.mockRestore();
  });

  it("throws a CognitoError with the short error code", async () => {
    const { auth } = await load();
    fetchMock.mockResolvedValue(
      jsonResponse(400, { __type: "NotAuthorizedException", message: "Incorrect username or password." })
    );

    await expect(auth.signIn("a@b.com", "bad")).rejects.toMatchObject({
      code: "NotAuthorizedException"
    });
    expect(auth.getAccessToken()).toBeNull();
  });

  it("rejects when Cognito asks for a further step instead of returning tokens", async () => {
    const { auth } = await load();
    fetchMock.mockResolvedValue(jsonResponse(200, { ChallengeName: "NEW_PASSWORD_REQUIRED" }));

    await expect(auth.signIn("a@b.com", "pw")).rejects.toMatchObject({
      code: "NEW_PASSWORD_REQUIRED"
    });
  });

  it("signOut clears the token", async () => {
    const { auth } = await load();
    fetchMock.mockResolvedValue(
      jsonResponse(200, { AuthenticationResult: { AccessToken: "tok" } })
    );
    await auth.signIn("a@b.com", "pw");

    auth.signOut();

    expect(auth.getAccessToken()).toBeNull();
  });
});

describe("gameHistoryApi.fetchGames", () => {
  const signedIn = async () => {
    const mods = await load();
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { AuthenticationResult: { AccessToken: "tok" } })
    );
    await mods.auth.signIn("a@b.com", "pw");
    return mods;
  };

  it("sends the bearer token, winner, limit and nextToken", async () => {
    const { api } = await signedIn();
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { games: [], count: 0 }));

    await api.fetchGames("Piotrek", "abc", 5);

    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe("https://api.example.com/games?winner=Piotrek&limit=5&nextToken=abc");
    expect(init.headers.Authorization).toBe("Bearer tok");
  });

  it("returns the page", async () => {
    const { api } = await signedIn();
    const page = {
      games: [{ gameId: "g1", winner: "Piotrek", finishedAt: "2026-11-22T10:00:00Z" }],
      count: 1,
      nextToken: "next"
    };
    fetchMock.mockResolvedValueOnce(jsonResponse(200, page));

    await expect(api.fetchGames("Piotrek")).resolves.toEqual(page);
  });

  it("refuses to call the API when not signed in", async () => {
    const { api } = await load();

    await expect(api.fetchGames("Piotrek")).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("signs out when the API answers 401 (expired token)", async () => {
    const { api, auth } = await signedIn();
    fetchMock.mockResolvedValueOnce(jsonResponse(401, { message: "Unauthorized" }));

    await expect(api.fetchGames("Piotrek")).rejects.toMatchObject({ status: 401 });
    expect(auth.getAccessToken()).toBeNull();
  });

  it("surfaces the API's error message", async () => {
    const { api } = await signedIn();
    fetchMock.mockResolvedValueOnce(jsonResponse(400, { error: "invalid nextToken" }));

    await expect(api.fetchGames("Piotrek", "bad")).rejects.toMatchObject({
      status: 400,
      message: "invalid nextToken"
    });
  });
});
