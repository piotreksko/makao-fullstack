import * as cdk from "aws-cdk-lib";
import { MakaoStack } from "../lib/makao-stack";

const app = new cdk.App();

new MakaoStack(app, "MakaoStack", {
  // The account only allows eu-north-1 (Stockholm), see the SCP errors.
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: "eu-north-1",
  },
});
