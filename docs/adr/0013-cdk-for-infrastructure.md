# 0013. AWS CDK (TypeScript) for the serverless infrastructure

Status: Accepted (`infra/`)
Date: 2026-11-21

## Context

The serverless slice was first built by hand in the console: a DynamoDB table and index, a Lambda pasted in after a manual esbuild bundle, a state machine, and a Cognito pool. That taught how each service behaves, but the result could not be reproduced, reviewed, or torn down cleanly. The console also attached broad roles (`PowerUserAccess`) to the Lambda and the state machine without being asked.

## Decision

- **Define the infrastructure with AWS CDK in TypeScript** in `infra/`, one stack (`MakaoStack`) in `eu-north-1`: the table and its GSI, the query Lambda (`NodejsFunction`, bundled by esbuild at deploy time), the Step Functions state machine (`LambdaInvoke`, `Choice`, and `Pass` states with JSONata), and the Cognito pool and client.
- **Let CDK generate IAM.** `table.grantReadData(fn)` gives the Lambda read access to that table and its indexes only, and the state machine's role can only invoke that one function.
- **Resources get generated names**, so they cannot collide with the hand-made ones, which were then deleted.
- **Deploy by hand from a laptop for now** (`cdk diff`, then `cdk deploy`). A pull-request workflow that runs `cdk diff` with short-lived AWS credentials over OIDC is a later step.
- **Sandbox settings**: `RemovalPolicy.DESTROY` on the table and the user pool so `cdk destroy` removes everything, including data.

## Alternatives considered

- **Console only**: fastest for learning, but nothing is repeatable or reviewable.
- **Raw CloudFormation or SAM**: more verbose (CloudFormation), or narrower in scope (SAM).
- **Terraform**: widely used and multi-cloud, but this stack is TypeScript end to end, so CDK reuses the language, the editor tooling, and the type checker.

## Consequences

- One command creates or removes the whole stack, and `cdk diff` shows exactly what a change would do before it happens.
- CloudFormation tracks resources by their logical IDs, so renaming a construct replaces the resource. That is data loss on a table unless it is retained, so renames need a `cdk diff` first.
- Changing a CDK-managed resource in the console causes drift that the next deploy may overwrite.
- A one-time `cdk bootstrap` per account and region creates an S3 bucket and roles that CDK uses.
- The Lambda handler is bundled from `lambdas/`, so `esbuild` is a devDependency there, and `NodejsFunction` needs `projectRoot` set to that package because the handler lives outside `infra/`.
- The old NestJS and Postgres parts of the app are not managed by this stack. The earlier plan (ECS Fargate, RDS, ElastiCache) would be a separate decision.
