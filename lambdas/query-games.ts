import { CreateGlobalSecondaryIndexAction$, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "eu-north-1" });
const docClient = DynamoDBDocumentClient.from(client);
const command = new QueryCommand({
  TableName: "makao-games",
  IndexName: "winner-finishedAt-index",
  KeyConditionExpression: "winner = :w",
  ExpressionAttributeValues: { ":w": "Piotrek" }
});

const result = await docClient.send(command);
console.log(result.Items, result.Count, result.ScannedCount);