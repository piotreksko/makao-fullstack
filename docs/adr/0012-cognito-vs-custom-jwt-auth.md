# 0012. Cognito for the serverless slice, custom JWT stays for the NestJS server

Status: Accepted as an experiment. A Cognito user pool exists in the CDK stack and was tested from the CLI; nothing in the client or server uses it yet.
Date: 2026-11-21

## Context

The NestJS server authenticates with bcrypt-hashed passwords and its own HS256 JWTs (ADRs 0002 and 0003). That works and is tested.

Identity and account management is a core concern in the roles this project is meant to prepare for, and Cognito is AWS's managed answer. A user pool was created and exercised end to end: sign-up, confirmation, `USER_PASSWORD_AUTH` login, and decoding the returned tokens.

## Decision

- **Add a Cognito user pool and a public app client (no secret) to the CDK stack**, with email as the sign-in identifier, self sign-up, and the password and SRP flows enabled. The password flow is there only so the CLI test works. A browser client should use the hosted UI or SRP with the authorization code flow and PKCE.
- **Keep the existing NestJS auth as it is.** Replacing it would touch the register and login endpoints, the `users` table, and the client's token storage (ADR 0004) for no gain to a single-app game.
- **Treat the Cognito pool as the identity layer for the serverless slice**: an API Gateway Cognito authorizer in front of the Lambda is the intended next step.

## Alternatives considered

- **Replace the custom auth with Cognito everywhere**: removes password storage and reset code from the server, but needs a migration of existing users and changes to every client auth call.
- **Stay custom only**: simplest, but leaves the serverless endpoints without a managed identity story.

## Consequences

- Cognito handles password hashing, email verification, recovery, MFA, and token signing with rotating keys that services verify through a public JWKS endpoint, so no shared secret.
- It supports federation (Google, SAML, OIDC providers such as Okta or Azure AD), which custom auth would have to build.
- Two identity systems would exist if both were used. A user's `sub` (Cognito) and `users.id` (Postgres) would need to be linked.
- Access tokens carry `client_id` and `scope`, and ID tokens carry `aud` and `email`. An API must check `iss`, the audience or client, `token_use`, and `exp`.
- Some pool settings (required attributes, sign-in aliases) cannot be changed after creation, so they must be chosen carefully.
- The test user was confirmed with `admin-confirm-sign-up`, so its `email_verified` is `false`. A real flow sends a code by email.
