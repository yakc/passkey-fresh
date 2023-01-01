import * as fido2 from "https://deno.land/x/fido2@3.3.4/dist/main.js";
import { CredStore } from "./CredStore.ts";
import {
  attestationOptionsMarshaller,
  AuthAttestationOptions,
  AuthNticationOptions,
  challengeMarshaller,
  MarshalledAssertionOptions,
  MarshalledAttestationOptions,
} from "./IsoAuthLib.ts";

export const REG_CHALLENGE_COOKIE_KEY = "reg-challenge";
export const AUTH_CHALLENGE_COOKIE_KEY = "auth-challenge";

// Adapted from https://developer.mozilla.org/en-US/docs/Glossary/Base64
//
function b64ToUint6(nChr: number) {
  return nChr > 64 && nChr < 91
    ? nChr - 65
    : nChr > 96 && nChr < 123
    ? nChr - 71
    : nChr > 47 && nChr < 58
    ? nChr + 4
    : nChr === 43
    ? 62
    : nChr === 47
    ? 63
    : 0;
}

function base64DecToArr(sBase64: string, nBlocksSize = 0) {
  const sB64Enc = sBase64.replace(/[^A-Za-z0-9+/]/g, "");
  const nInLen = sB64Enc.length;
  const nOutLen = nBlocksSize
    ? Math.ceil(((nInLen * 3 + 1) >> 2) / nBlocksSize) * nBlocksSize
    : (nInLen * 3 + 1) >> 2;
  const taBytes = new Uint8Array(nOutLen);

  let nMod3;
  let nMod4;
  let nUint24 = 0;
  let nOutIdx = 0;
  for (let nInIdx = 0; nInIdx < nInLen; nInIdx++) {
    nMod4 = nInIdx & 3;
    nUint24 |= b64ToUint6(sB64Enc.charCodeAt(nInIdx)) << (6 * (3 - nMod4));
    if (nMod4 === 3 || nInLen - nInIdx === 1) {
      nMod3 = 0;
      while (nMod3 < 3 && nOutIdx < nOutLen) {
        taBytes[nOutIdx] = (nUint24 >>> ((16 >>> nMod3) & 24)) & 255;
        nMod3++;
        nOutIdx++;
      }
      nUint24 = 0;
    }
  }

  return taBytes;
}
//
// Seems there should be a simpler way to do that

export interface RelyingParty {
  id?: string;
  name?: string;
}

export interface User {
  id?: string;
}

export interface BasicAuthLibOptions {
  rpName: string;
  rpIcon?: string; // URL for the service's icon. Can be a RFC 2397 data URL.
}

export class AuthRegistrationWrapper {
  constructor(readonly options: AuthAttestationOptions) {}

  marshall(): MarshalledAttestationOptions {
    return attestationOptionsMarshaller.marshal(this.options);
    // return Object.assign({}, this.options, {
    //   challenge: btoa(
    //     String.fromCharCode(...new Uint8Array(this.options.challenge)),
    //   ),
    // });
  }

  static unmarshall(m: MarshalledAttestationOptions): AuthRegistrationWrapper {
    return new AuthRegistrationWrapper(unmarshallAttestationOptions(m));
  }
}

export function unmarshallAttestationOptions(
  m: MarshalledAttestationOptions,
): AuthAttestationOptions {
  console.log("challenge", m.challenge);
  return Object.assign(m, { challenge: base64DecToArr(m.challenge) });
}

interface Expectation {
  challenge: string;
  origin: string;
  factor: "first" | "secord" | "either";
}

export type AttestationExpectation = Expectation;

export interface AssertionExpectation extends Expectation {
  publicKey: string;
  prevCounter: number;
  userHandle: string;
}

export interface RegistrationSuccess {
  counter: number;
  publicKeyPem: string;
  userHandle: string;
}

export class AuthLib {
  #f2l: fido2.Fido2Lib;
  #attestationOptions: () => Promise<AuthAttestationOptions>;
  #assertionOptions: () => Promise<AuthNticationOptions>;

  constructor(options: BasicAuthLibOptions) {
    this.#f2l = new fido2.Fido2Lib(options);
    this.#attestationOptions = this.#f2l.attestationOptions.bind(
      this.#f2l,
    ) as () => Promise<AuthAttestationOptions>;
    this.#assertionOptions = this.#f2l.assertionOptions.bind(this.#f2l) as () =>
      Promise<AuthNticationOptions>;
  }

  registrationOptions(): Promise<AuthRegistrationWrapper> {
    return this.#attestationOptions()
      .then((o) => {
        // console.log(
        //   "this.#f2l.attestationOptions",
        //   o,
        //   Marshaller.encode(o.challenge),
        // );
        return new AuthRegistrationWrapper(o);
      });
  }

  async validateRegistration(
    user: string,
    clientAttestationResponse: PublicKeyCredential,
    attestationExpectation: AttestationExpectation,
  ): Promise<RegistrationSuccess> {
    try {
      const regResult = await this.#f2l.attestationResult(
        clientAttestationResponse,
        attestationExpectation,
      );
      console.log("regResult", regResult);
      const publicKeyPem = String(
        regResult.authnrData?.get("credentialPublicKeyPem"),
      );
      if (!publicKeyPem) {
        throw `validated registration missing public key`;
      }
      const counter = regResult.authnrData?.get("counter");
      if (counter !== 0) {
        throw `expected validated registration counter to be zero, not: ${counter}`;
      }
      const cred = {
        publicKeyPem,
        counter,
        userHandle: user,
      };
      const cs = await CredStore.load();
      cs.store(cred);
      return cred;
    } catch (x) {
      console.error(x);
      throw x;
    }
  }

  authnOptions(): Promise<MarshalledAssertionOptions> {
    return this.#assertionOptions()
      .then((o) => {
        // console.log(
        //   "this.#f2l.assertionOptions",
        //   o,
        //   Marshaller.encode(o.challenge),
        // );
        return challengeMarshaller.marshal(o);
      });
  }

  async validateAuthentication(
    body: PublicKeyCredential,
    assertionExpectation: AssertionExpectation,
  ) {
    try {
      const result = await this.#f2l.assertionResult(
        body,
        assertionExpectation,
      );
      // console.log("assertion result", result);
      console.log("authenticated", assertionExpectation.userHandle);
      return result.authnrData;
    } catch (x) {
      console.error(x);
      throw x;
    }
  }
}
