import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

// Created once, outside the handler. Lambda reuses the same container for many
// invocations, so this connection setup is skipped on "warm" calls.
const docClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION ?? "eu-north-1" }),
);

const TABLE_NAME = process.env.TABLE_NAME ?? "makao-games";
const INDEX_NAME = process.env.INDEX_NAME ?? "winner-finishedAt-index";

// Minimal event shape: works for the console "Test" button ({ "winner": "Piotrek" })
// and for API Gateway / Function URL calls (?winner=Piotrek).
type GamesEvent = {
  winner?: string;
  queryStringParameters?: { winner?: string } | null;
};

export const handler = async (event: GamesEvent) => {
  const winner = event.winner ?? event.queryStringParameters?.winner;

  if (!winner) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "winner is required" }),
    };
  }

  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: INDEX_NAME,
      KeyConditionExpression: "winner = :w",
      ExpressionAttributeValues: { ":w": winner },
      ScanIndexForward: false, // newest first (sort key is finishedAt)
    }),
  );

  return {
    statusCode: 200,
    body: JSON.stringify({ games: result.Items ?? [], count: result.Count }),
  };
};
