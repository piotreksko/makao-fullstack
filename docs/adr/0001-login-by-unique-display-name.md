# 0001. Log in by unique display name, keep email for future recovery

Status: Accepted
Date: 2026-09-21

## Context

Users need an identifier to log in with. Web apps usually use email, but this is a game where players expect a unique visible name. Email is still useful for password reset later.

## Decision

- Login uses `displayName` + `password`.
- `displayName` and `email` are both unique columns of type Postgres `citext`.
- `citext` makes comparisons and the unique index case-insensitive while preserving the original casing for display (`Piotr` and `piotr` cannot both exist).
- Register validates `displayName` as 3-20 characters of letters, numbers and underscores.

## Alternatives considered

- **Login by email only, non-unique display name:** simplest, but two players could share a name in-game.
- **Lowercased shadow column for uniqueness:** works without an extension, but needs extra column and normalization code in every write and lookup.
- **`LOWER()` in queries:** handles lookup but does not stop duplicates.

## Consequences

- The `citext` extension must be available; TypeORM creates it on first start when the DB user is a superuser (true for the Docker setup).
- Duplicate name or email returns a single generic 409, so users are not told which field collided.
- A registration attempt reveals whether a display name exists (it is a public name, so this is accepted).
- No email verification or password reset yet; a forgotten password currently means a lost account.
