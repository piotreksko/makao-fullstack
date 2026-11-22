import * as path from "node:path";
import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigw from "aws-cdk-lib/aws-apigatewayv2";
import * as authorizers from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as cloudwatchActions from "aws-cdk-lib/aws-cloudwatch-actions";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as logs from "aws-cdk-lib/aws-logs";
import * as sns from "aws-cdk-lib/aws-sns";
import * as subscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as tasks from "aws-cdk-lib/aws-stepfunctions-tasks";
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

    // Lambda creates its log group on first run with retention "never expire",
    // so logs would accumulate (and bill) forever. Owning the group lets us cap it.
    const getGamesLogs = new logs.LogGroup(this, "GetGamesLogs", {
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // sandbox only
    });

    // NodejsFunction bundles the TypeScript with esbuild on deploy,
    // replacing the manual build-and-paste routine.
    const getGames = new nodejs.NodejsFunction(this, "GetGamesFn", {
      logGroup: getGamesLogs,
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

    // Same workflow as the console one (see makao-game-stats.asl.json):
    // invoke the Lambda, then branch on how many games came back.
    // The *.jsonata variants use the JSONata query language, like the console version.
    const queryGames = tasks.LambdaInvoke.jsonata(this, "Lambda Invoke", {
      lambdaFunction: getGames,
      outputs: "{% $states.result.Payload %}",
    });

    const hasGames = sfn.Pass.jsonata(this, "HasGames");
    const noGames = sfn.Pass.jsonata(this, "NoGames");

    const anyGames = sfn.Choice.jsonata(this, "Choice")
      .when(
        sfn.Condition.jsonata("{% $parse($states.input.body).count > 0 %}"),
        hasGames,
      )
      .otherwise(noGames);

    const stateMachine = new sfn.StateMachine(this, "GameStatsMachine", {
      definitionBody: sfn.DefinitionBody.fromChainable(queryGames.next(anyGames)),
    });
    // CDK also adds lambda:InvokeFunction for just this function to the
    // machine's role (the console gave it PowerUserAccess instead).

    // Users sign in with their email; Cognito issues the JWTs.
    const userPool = new cognito.UserPool(this, "UserPool", {
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      removalPolicy: cdk.RemovalPolicy.DESTROY, // sandbox only
    });

    // Public client (no secret), like the SPA client from the console.
    // userPassword is only here so the CLI test (initiate-auth) works.
    const userPoolClient = userPool.addClient("WebClient", {
      generateSecret: false,
      authFlows: { userPassword: true, userSrp: true },
    });

    new cdk.CfnOutput(this, "UserPoolId", { value: userPool.userPoolId });
    new cdk.CfnOutput(this, "UserPoolClientId", { value: userPoolClient.userPoolClientId });
    // HTTP API in front of the Lambda. The JWT authorizer checks the Cognito
    // token's signature, issuer, expiry and audience before the Lambda runs.
    // It matches the app client ID against `aud` (ID token) or `client_id`
    // (access token), so send the access token.
    const authorizer = new authorizers.HttpJwtAuthorizer(
      "CognitoAuthorizer",
      `https://cognito-idp.${this.region}.amazonaws.com/${userPool.userPoolId}`,
      { jwtAudience: [userPoolClient.userPoolClientId] },
    );

    // Browsers block cross-origin calls unless the API says the origin is
    // allowed. API Gateway answers the OPTIONS preflight itself.
    // Add the production domain here when there is one.
    const httpApi = new apigw.HttpApi(this, "GamesApi", {
      corsPreflight: {
        allowOrigins: ["http://localhost:3000"],
        allowMethods: [apigw.CorsHttpMethod.GET],
        allowHeaders: ["Authorization", "Content-Type"],
      },
    });
    httpApi.addRoutes({
      path: "/games",
      methods: [apigw.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration("GetGamesIntegration", getGames),
      authorizer,
    });

    // Alarms notify an SNS topic. Set ALARM_EMAIL when deploying to get emails:
    //   ALARM_EMAIL=me@example.com npx cdk deploy
    // (the address is confirmed through a link AWS sends, and is never in git).
    const alarmTopic = new sns.Topic(this, "AlarmTopic");
    if (process.env.ALARM_EMAIL) {
      alarmTopic.addSubscription(new subscriptions.EmailSubscription(process.env.ALARM_EMAIL));
    }
    const notify = new cloudwatchActions.SnsAction(alarmTopic);

    // Lambda "Errors" counts crashes, timeouts and out-of-memory kills, NOT
    // failures the handler catches and answers with a 500 itself.
    const lambdaErrors = new cloudwatch.Alarm(this, "GetGamesErrorsAlarm", {
      alarmDescription: "GetGamesFn crashed, timed out or ran out of memory",
      metric: getGames.metricErrors({ period: cdk.Duration.minutes(5), statistic: "Sum" }),
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING, // no traffic is not a failure
    });

    // That is what this one covers: any 5xx the API returns, including the
    // handler's own "internal error" responses.
    const apiServerErrors = new cloudwatch.Alarm(this, "ApiServerErrorsAlarm", {
      alarmDescription: "GamesApi returned 5xx responses",
      metric: httpApi.metricServerError({ period: cdk.Duration.minutes(5), statistic: "Sum" }),
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    for (const alarm of [lambdaErrors, apiServerErrors]) {
      alarm.addAlarmAction(notify);
      alarm.addOkAction(notify);
    }

    new cdk.CfnOutput(this, "ApiUrl", { value: httpApi.apiEndpoint });
    new cdk.CfnOutput(this, "LogGroupName", { value: getGamesLogs.logGroupName });
    new cdk.CfnOutput(this, "StateMachineArn", { value: stateMachine.stateMachineArn });
    new cdk.CfnOutput(this, "FunctionName", { value: getGames.functionName });
    new cdk.CfnOutput(this, "TableName", { value: table.tableName });
  }
}
