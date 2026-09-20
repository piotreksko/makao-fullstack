# 0003. Password hashing with bcrypt, cost 10

Status: Accepted
Date: 2026-09-21

## Context

Passwords must be stored so that a database leak does not reveal them.

## Decision

- Hash with `bcrypt` (`bcrypt.hash(password, 10)`); store only the result in `users.passwordHash`. The hash embeds its own random salt and cost.
- Verify with `bcrypt.compare` in `AuthService.login`.
- `passwordHash` is `select: false`, so normal queries never load it. Only `UserService.findByDisplayNameWithHash` opts in.
- Register enforces password length 8-72. bcrypt ignores bytes beyond 72, so a longer maximum would add no security. Login only requires a non-empty string.
- Login returns the same 401 message for an unknown name and a wrong password.

## Alternatives considered

- **argon2:** newer and memory-hard, but bcrypt is well supported in the Node/Nest ecosystem and sufficient here.
- **Higher cost (12+):** slower for attackers and for legitimate logins; 10 is a common default and can be raised later since the cost is stored in each hash.

## Consequences

- `bcrypt` is a native module and can complicate builds on some platforms.
- Hashing is deliberately slow, which also makes many parallel logins CPU-expensive; rate limiting on auth routes is not implemented yet.
- `UserService.create` returns the entity including the hash, so callers must never send it to a client.
