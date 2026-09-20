# 0004. Where the client stores the JWT

Status: Proposed (not decided)
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

TBD.

## Consequences to weigh

- The 1 hour expiry (0002) means the client must handle 401 by redirecting to login whichever option is chosen.
- Option A is the least work; option B is the more defensible security posture for anything beyond a learning project.
