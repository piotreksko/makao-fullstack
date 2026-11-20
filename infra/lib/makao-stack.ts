import * as path from "node:path";
import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";

const GAMES_BY_WINNER_INDEX = "winner-finishedAt-index";

export class MakaoStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Same design as the console table: key gameId, on-demand billing.
    // No explicit tableName: CDK generates one, so it can't clash with the
    // console-made "makao-games".
    const table = new dynamodb.Table(this, "GamesTable", {
      partitionKey: { name: "gameId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // sandbox: `cdk destroy` deletes data too
    });

    table.addGlobalSecondaryIndex({
      indexName: GAMES_BY_WINNER_INDEX,
      partitionKey: { name: "winner", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "finishedAt", type: dynamodb.AttributeType.STRING },
    });

    // NodejsFunction bundles the TypeScript with esbuild on deploy,
    // replacing the manual build-and-paste routine.
    const getGames = new nodejs.NodejsFunction(this, "GetGamesFn", {
      // The handler lives outside infra/. CDK runs esbuild from projectRoot,
      // so that's the lambdas package (which has esbuild as a devDependency).
      entry: path.join(import.meta.dirname, "../../lambdas/handler.ts"),
      projectRoot: path.join(import.meta.dirname, "../../lambdas"),
      depsLockFilePath: path.join(import.meta.dirname, "../../lambdas/package-lock.json"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_22_X,
      environment: {
        TABLE_NAME: table.tableName,
        INDEX_NAME: GAMES_BY_WINNER_INDEX,
      },
    });

    // Least privilege in one line: the role can read this table (and its
    // indexes) and nothing else.
    table.grantReadData(getGames);

    new cdk.CfnOutput(this, "FunctionName", { value: getGames.functionName });
    new cdk.CfnOutput(this, "TableName", { value: table.tableName });
  }
}
