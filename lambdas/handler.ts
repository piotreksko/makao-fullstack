import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

// Created once, outside the handler. Lambda reuses the same container for many
// invocations, so this connection setup is skipped on "warm" calls.
const docClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION ?? "eu-north-1" }),
);

const TABLE_NAME = process.env.TABLE_NAME ?? "makao-games";
const INDEX_NAME = process.env.INDEX_NAME ?? "winner-finishedAt-index";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

type Params = { winner?: string; limit?: string | number; nextToken?: string };

// Minimal event shape: works for the console "Test" button ({ "winner": "Piotrek" })
// and for API Gateway / Function URL calls (?winner=Piotrek&limit=20&nextToken=...).
type GamesEvent = Params & {
  queryStringParameters?: Params | null;
};

const json = (statusCode: number, body: unknown) => ({
  statusCode,
  body: JSON.stringify(body),
});

// The token is DynamoDB's LastEvaluatedKey, base64-encoded so it travels in a URL.
// Clients treat it as opaque: pass it back to get the next page.
const encodeToken = (key: Record<string, unknown>) =>
  Buffer.from(JSON.stringify(key)).toString("base64url");

const decodeToken = (token: string): Record<string, unknown> | null => {
  try {
    const key = JSON.parse(Buffer.from(token, "base64url").toString("utf8"));
    return key && typeof key === "object" && !Array.isArray(key) ? key : null;
  } catch {
    return null;
  }
};

export const handler = async (event: GamesEvent) => {
  const params: Params = { ...event.queryStringParameters, ...event };
  const { winner, nextToken } = params;

  if (!winner) {
    return json(400, { error: "winner is required" });
  }

  const limit = params.limit === undefined ? DEFAULT_LIMIT : Number(params.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    return json(400, { error: `limit must be an integer from 1 to ${MAX_LIMIT}` });
  }

  let exclusiveStartKey: Record<string, unknown> | undefined;
  if (nextToken) {
    const decoded = decodeToken(nextToken);
    if (!decoded) {
      return json(400, { error: "invalid nextToken" });
    }
    exclusiveStartKey = decoded;
  }

  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: INDEX_NAME,
        KeyConditionExpression: "winner = :w",
        ExpressionAttributeValues: { ":w": winner },
        ScanIndexForward: false, // newest first (sort key is finishedAt)
        Limit: limit,
        ExclusiveStartKey: exclusiveStartKey,
      }),
    );

    return json(200, {
      games: result.Items ?? [],
      count: result.Count ?? 0,
      // Present only when more games remain.
      ...(result.LastEvaluatedKey && { nextToken: encodeToken(result.LastEvaluatedKey) }),
    });
  } catch (err) {
    // Full error goes to CloudWatch; the caller gets a generic message.
    console.error("Failed to query games", err);
    return json(500, { error: "internal error" });
  }
};
