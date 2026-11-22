// Sign-in against the Cognito user pool from the serverless slice (ADR 0012).
// Separate from the NestJS login in authApi.ts: this identity is only used to
// call the AWS-hosted game history API.

const REGION = import.meta.env.VITE_COGNITO_REGION || "eu-north-1";
const CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID as string | undefined;

export const isCognitoConfigured = Boolean(CLIENT_ID);

// Kept in memory only: nothing is readable by injected scripts via
// localStorage, at the cost of signing in again after a page reload.
let accessToken: string | null = null;

export const getAccessToken = (): string | null => accessToken;

export const signOut = (): void => {
  accessToken = null;
};

export class CognitoError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

// Plain USER_PASSWORD_AUTH over fetch, enabled on the app client in the CDK
// stack. A production app should use SRP (the password never leaves the
// browser) or the hosted UI with the authorization code flow and PKCE.
export const signIn = async (email: string, password: string): Promise<void> => {
  if (!CLIENT_ID) throw new CognitoError("NotConfigured", "Cognito is not configured");

  const res = await fetch(`https://cognito-idp.${REGION}.amazonaws.com/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-amz-json-1.1",
      "X-Amz-Target": "AWSCognitoIdentityProviderService.InitiateAuth"
    },
    body: JSON.stringify({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: CLIENT_ID,
      AuthParameters: { USERNAME: email, PASSWORD: password }
    })
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    // Cognito errors look like { __type: "NotAuthorizedException", message }
    const code = String(body?.__type ?? "Unknown").split("#").pop() as string;
    throw new CognitoError(code, body?.message ?? "Sign-in failed");
  }

  const token: string | undefined = body?.AuthenticationResult?.AccessToken;
  if (!token) {
    // e.g. NEW_PASSWORD_REQUIRED or an MFA challenge: not handled here
    throw new CognitoError(body?.ChallengeName ?? "NoToken", "Sign-in needs a further step");
  }

  accessToken = token;
};
