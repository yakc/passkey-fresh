// Type decls and lean isomorphic impls: islands-authform.js
// is 3KB in 80ms instead of 248KB in 185ms with full AuthLib
//
/// <reference lib="dom" />
import { Marshaller } from "./Marshaller.ts";

type ChallengeBuffer<T> = Omit<T, "challenge"> & {
  challenge: ArrayBuffer;
};

type ChallengeString<T> = Omit<T, "challenge"> & {
  challenge: string;
};

export type AuthAttestationOptions = ChallengeBuffer<
  PublicKeyCredentialCreationOptions
>;

// export interface AuthAttestationOptions {
//   rp: RelyingParty
//   user: User
//   challenge: ArrayBuffer
//   pubKeyCredParams: any
//   // deno-lint-ignore no-explicit-any
//   extensions?: Record<string, any>
// }

export type MarshalledAttestationOptions = ChallengeString<
  AuthAttestationOptions
>;

export const attestationOptionsMarshaller = new Marshaller<
  AuthAttestationOptions,
  MarshalledAttestationOptions
>().fields("challenge");

export type MarshalledAuthenticatorAttestationResponse =
  AuthenticatorAttestationResponse;
export type MarshalledPublicKeyCredential =
  & Omit<PublicKeyCredential, "rawId" | "response">
  & {
    rawId: string;
    response: MarshalledAuthenticatorAttestationResponse;
  };

export const attestationResponseMarshaller = new Marshaller<
  PublicKeyCredential,
  MarshalledPublicKeyCredential
>().fields("rawId")
  .nested(
    "response",
    new Marshaller().fields("attestationObject", "clientDataJSON"),
  );

export function deriveUserHandle(
  username: string,
  rpId: string,
): Promise<ArrayBuffer> {
  return crypto.subtle.digest(
    "SHA-512",
    new TextEncoder().encode(`${username}@${rpId}`),
  );
}

export interface RegistrationRequest {
  user: string;
  attestation: MarshalledPublicKeyCredential;
}

export type AuthNticationOptions = ChallengeBuffer<
  PublicKeyCredentialRequestOptions
>;
export type MarshalledAssertionOptions = ChallengeString<AuthNticationOptions>;

export const assertionResponseMarshaller = new Marshaller<
  PublicKeyCredential,
  MarshalledPublicKeyCredential
>().fields("rawId")
  .nested(
    "response",
    new Marshaller().fields(
      "authenticatorData",
      "signature",
      "userHandle",
      "clientDataJSON",
    ),
  );

export const challengeMarshaller = new Marshaller<
  // deno-lint-ignore no-explicit-any
  ChallengeBuffer<any>,
  // deno-lint-ignore no-explicit-any
  ChallengeString<any>
>().fields("challenge");
