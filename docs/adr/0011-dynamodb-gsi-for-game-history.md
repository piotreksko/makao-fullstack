# 0011. DynamoDB with a GSI for game history queries

Status: Accepted for the serverless slice (`infra/lib/makao-stack.ts`, `lambdas/handler.ts`). The NestJS server still writes finished games to Postgres (ADR 0010) and does not use this table yet.
Date: 2026-11-21

## Context

The one question the serverless slice has to answer is "which games did player X win, newest first?". The access pattern is known, read-heavy, and has no joins: one player's games, sorted by finish time.

A scan with a filter answers it, but DynamoDB reads every item and filters afterwards, and bills for all of them. On a 3-item table the scan reported `Count: 2, ScannedCount: 3`; the gap grows with the table.

The account also restricts which services and regions are usable (a service control policy on the AWS account). Only `eu-north-1` (Stockholm) is allowed.

## Decision

- **A `GamesTable`** with partition key `gameId` (string) and on-demand billing (`PAY_PER_REQUEST`). Traffic is low and bursty, and nothing bills while idle.
- **A global secondary index `winner-finishedAt-index`**: partition key `winner`, sort key `finishedAt` (ISO-8601 string, so it sorts chronologically). The Lambda queries it with `ScanIndexForward: false`, which returns the newest games first and reads only that player's items.
- **Plain JS values through the SDK's `DynamoDBDocumentClient`**, not the low-level typed format (`{"S": ...}`).
- **Everything is defined in CDK** (ADR 0013), with `RemovalPolicy.DESTROY` because this is a sandbox.

## Alternatives considered

- **Scan with a filter**: simplest, but cost and latency grow with the table. Kept only as the demonstration of the problem.
- **Keep the history in Postgres only**: the better choice if the data needs joins or ad-hoc queries, and it is what the server does today. DynamoDB is used here because the access pattern is fixed and because the slice is meant to be serverless (Lambda, Step Functions) where Postgres connection management is awkward.
- **Make `winner` the table's partition key**: breaks "get a game by id" and makes one player's games a single hot partition.

## Consequences

- Queries by player are key lookups: cost and latency do not grow with the total number of games.
- Any other question (games by date range across all players, games with more than 30 rounds) needs another index or a scan. The access patterns must be designed up front.
- Each write also updates the index, so writes cost more. GSI reads are eventually consistent.
- A new GSI on an existing large table has to backfill before it can be queried (it returned `Cannot read from backfilling global secondary index` for a short while on this one).
- Game data would exist in two places (Postgres and DynamoDB) if the server is ever wired to this table. That needs a decision about which store is the source of truth.
