# 0002. Stateless JWT access tokens, 1 hour expiry, no refresh token

Status: Accepted
Date: 2026-09-21

## Context

The API needs to authenticate requests from the React client. Options are server-side sessions or signed tokens.

## Decision

- `POST /auth/register` and `POST /auth/login` return `{ accessToken }`, a JWT signed with `JWT_SECRET` (HS256 default, via `@nestjs/jwt`), expiring after `JWT_EXPIRES_IN` (default 1 hour; set to 7d in the development `.env` so token expiry does not interrupt backend work).
- Payload is `{ sub: userId, displayName }`. It is signed, not encrypted, so it must never contain secrets.
- Protected routes use `JwtAuthGuard` (Passport `jwt` strategy). `JwtStrategy.validate` loads the user by `sub`, so a token for a deleted account is rejected, and sets `req.user = { id, displayName }`.
- No refresh tokens for now.

## Alternatives considered

- **Server-side sessions (Redis is already in the stack):** allow instant revocation, but need session storage and a lookup on every request.
- **Short access token + refresh token:** better revocation story, more moving parts (rotation, storage, extra endpoints).

## Consequences

- No server state needed to verify a request beyond one user lookup.
- Logout is client-side only: a stolen token stays valid until it expires.
- After 1 hour the user must log in again; the client must handle the resulting 401.
- `JWT_SECRET` must be a long random value in production; the dev value in `.env` is a placeholder.
- Revisit if revocation or longer sessions become requirements.
