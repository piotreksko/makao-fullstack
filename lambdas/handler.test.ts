import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { handler } from "./handler";

// Replaces the DocumentClient's send(), so no test touches AWS.
const ddbMock = mockClient(DynamoDBDocumentClient);

describe("handler", () => {
  beforeEach(() => {
    ddbMock.reset();
  });

  it("returns 400 when winner is missing", async () => {
    const res = await handler({});

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body)).toEqual({ error: "winner is required" });
    expect(ddbMock.calls()).toHaveLength(0);
  });

  it("queries the GSI newest-first for the winner from the query string", async () => {
    const games = [{ gameId: "g1", winner: "Piotrek", finishedAt: "2026-11-22T10:00:00Z" }];
    ddbMock.on(QueryCommand).resolves({ Items: games, Count: 1 });

    const res = await handler({ queryStringParameters: { winner: "Piotrek" } });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ games, count: 1 });

    const input = ddbMock.commandCalls(QueryCommand)[0]!.args[0].input;
    expect(input.IndexName).toBe("winner-finishedAt-index");
    expect(input.KeyConditionExpression).toBe("winner = :w");
    expect(input.ExpressionAttributeValues).toEqual({ ":w": "Piotrek" });
    expect(input.ScanIndexForward).toBe(false);
  });

  it("accepts winner directly on the event (Step Functions style)", async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [], Count: 0 });

    const res = await handler({ winner: "Anna" });

    expect(res.statusCode).toBe(200);
    expect(ddbMock.commandCalls(QueryCommand)[0]!.args[0].input.ExpressionAttributeValues).toEqual({
      ":w": "Anna",
    });
  });

  it("returns an empty list when nothing matches", async () => {
    ddbMock.on(QueryCommand).resolves({ Count: 0 });

    const res = await handler({ winner: "Nobody" });

    expect(JSON.parse(res.body)).toEqual({ games: [], count: 0 });
  });

  it("rejects an empty winner", async () => {
    const res = await handler({ queryStringParameters: { winner: "" } });

    expect(res.statusCode).toBe(400);
    expect(ddbMock.calls()).toHaveLength(0);
  });

  describe("pagination", () => {
    it("uses a default limit of 50", async () => {
      ddbMock.on(QueryCommand).resolves({ Items: [], Count: 0 });

      await handler({ winner: "Piotrek" });

      expect(ddbMock.commandCalls(QueryCommand)[0]!.args[0].input.Limit).toBe(50);
    });

    it("passes a limit from the query string (strings are converted)", async () => {
      ddbMock.on(QueryCommand).resolves({ Items: [], Count: 0 });

      await handler({ queryStringParameters: { winner: "Piotrek", limit: "20" } });

      expect(ddbMock.commandCalls(QueryCommand)[0]!.args[0].input.Limit).toBe(20);
    });

    it.each(["0", "101", "abc", "1.5", "-3"])("rejects limit %s", async (limit) => {
      const res = await handler({ queryStringParameters: { winner: "Piotrek", limit } });

      expect(res.statusCode).toBe(400);
      expect(ddbMock.calls()).toHaveLength(0);
    });

    it("returns a nextToken when DynamoDB has more, and accepts it back", async () => {
      const lastKey = { gameId: "g5", winner: "Piotrek", finishedAt: "2026-11-01T00:00:00Z" };
      ddbMock.on(QueryCommand).resolves({ Items: [{ gameId: "g5" }], Count: 1, LastEvaluatedKey: lastKey });

      const first = await handler({ winner: "Piotrek", limit: 1 });
      const { nextToken } = JSON.parse(first.body);
      expect(nextToken).toEqual(expect.any(String));

      ddbMock.reset();
      ddbMock.on(QueryCommand).resolves({ Items: [], Count: 0 });

      const second = await handler({ queryStringParameters: { winner: "Piotrek", nextToken } });

      expect(second.statusCode).toBe(200);
      expect(JSON.parse(second.body)).not.toHaveProperty("nextToken");
      expect(ddbMock.commandCalls(QueryCommand)[0]!.args[0].input.ExclusiveStartKey).toEqual(lastKey);
    });

    it("omits nextToken on the last page", async () => {
      ddbMock.on(QueryCommand).resolves({ Items: [], Count: 0 });

      const res = await handler({ winner: "Piotrek" });

      expect(JSON.parse(res.body)).not.toHaveProperty("nextToken");
    });

    it.each(["not-base64-json", Buffer.from("[1,2]").toString("base64url")])(
      "rejects an invalid nextToken",
      async (nextToken) => {
        const res = await handler({ queryStringParameters: { winner: "Piotrek", nextToken } });

        expect(res.statusCode).toBe(400);
        expect(JSON.parse(res.body)).toEqual({ error: "invalid nextToken" });
        expect(ddbMock.calls()).toHaveLength(0);
      },
    );
  });

  it("returns a 500 with a generic message when DynamoDB fails", async () => {
    ddbMock.on(QueryCommand).rejects(new Error("table exploded: secret details"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await handler({ winner: "Piotrek" });

    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body)).toEqual({ error: "internal error" });
    expect(consoleError).toHaveBeenCalled(); // logged for CloudWatch, not leaked to the caller
    consoleError.mockRestore();
  });
});
