# 0005. TypeORM `synchronize: true` during development

Status: Accepted (temporary)
Date: 2026-09-21

## Context

The schema is still changing quickly (entities were added and edited during Phase 1 and 2). `server/src/app.module.ts` configures TypeORM with `synchronize: true` and `autoLoadEntities: true`.

## Decision

Keep `synchronize: true` while developing so the database schema follows the entities automatically on startup, including creating the `users` table and the `citext` extension.

## Consequences

- No migration files to maintain right now.
- On startup TypeORM may alter or drop columns to match the entities, which can destroy data. It must not be enabled against production data.
- Before any deployment with real data: set `synchronize: false`, generate an initial migration from the current entities, and run migrations as part of deploy.
- Changing a column type on a table that already has rows (for example `varchar` to `citext`) can fail under synchronize; in development the fix is usually to drop and recreate the table.
