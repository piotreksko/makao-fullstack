# 0004. Where the client stores the JWT

Status: Accepted (option A, implemented for now; revisit before any production use)
Date: 2026-09-21

## Context

The React client receives an access token from the API (see 0002) and must keep it and attach it to later requests. Where it is kept determines which attacks it is exposed to. This should be decided before the login and register forms are built.

## Options

**A. `localStorage` (or memory) + `Authorization: Bearer` header**
- Simple; works with the current API and CORS setup (no credentials).
- Any injected script (XSS) can read the token.
- Not sent automatically, so no CSRF risk.

**B. httpOnly, Secure, SameSite cookie set by the server**
- JavaScript cannot read the token, so XSS cannot steal it directly.
- Needs server changes: set the cookie on login, read it in `JwtStrategy`, a logout endpoint that clears it, CORS `credentials: true` with an explicit origin, and CSRF protection depending on the SameSite setting.
- Client and API on different origins complicates cookie settings.

**C. In-memory only**
- Safest from XSS persistence, but the user is logged out on every page refresh.

## Decision

Option A: the token is kept in `localStorage` (`client/src/services/tokenStorage.js`) and sent as `Authorization: Bearer` by `apiClient.js`. It needs no backend changes and works with the current CORS setup. On any 401 for a request that carried a token, the client clears it and shows the login page with a "session expired" message. The accepted risk is that an XSS bug could read the token, so the client must never render unsanitised user-supplied HTML. Move to option B (httpOnly cookie) before exposing this beyond development.

## Consequences to weigh

- The 1 hour expiry (0002) means the client must handle 401 by redirecting to login whichever option is chosen.
- Option A is the least work; option B is the more defensible security posture for anything beyond a learning project.
