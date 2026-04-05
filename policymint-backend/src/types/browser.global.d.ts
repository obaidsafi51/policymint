// Ambient stubs for browser-only APIs referenced by ox/webauthn.
// This backend never calls WebAuthn — these declarations satisfy the
// TypeScript compiler without shipping any runtime code.

declare global {
  interface Window {
    readonly location: { hostname: string; origin: string; href: string };
    readonly navigator: { credentials: CredentialsContainer };
    readonly document: { title: string };
  }

  var window: Window & typeof globalThis;

  interface AuthenticatorResponse {
    readonly clientDataJSON: ArrayBuffer;
  }

  interface AuthenticatorAttestationResponse extends AuthenticatorResponse {
    readonly attestationObject: ArrayBuffer;
    getAuthenticatorData(): ArrayBuffer;
    getPublicKey(): ArrayBuffer | null;
    getPublicKeyAlgorithm(): number;
    getTransports(): string[];
  }

  interface AuthenticatorAssertionResponse extends AuthenticatorResponse {
    readonly authenticatorData: ArrayBuffer;
    readonly signature: ArrayBuffer;
    readonly userHandle: ArrayBuffer | null;
  }

  interface AuthenticationExtensionsClientOutputs {
    appid?: boolean;
    hmacCreateSecret?: boolean;
    credProps?: { rk?: boolean };
  }

  interface CredentialPropertiesOutput {
    rk?: boolean;
  }
}

export {};
