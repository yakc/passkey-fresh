import { Handlers } from "$fresh/server.ts";
import {
  attestationResponseMarshaller,
  RegistrationRequest,
} from "lib/IsoAuthLib.ts";
import {
  AttestationExpectation,
  AUTH_CHALLENGE_COOKIE_KEY,
  REG_CHALLENGE_COOKIE_KEY,
} from "lib/AuthLib.ts";
import { authLib } from "lib/AuthLibInstance.ts";
import { SessionCookie } from "lib/SessionCookie.ts";

export const handler: Handlers = {
  async POST(req) {
    const sc = await SessionCookie.fromRequest(req);
    const body = JSON.parse(await req.text()) as RegistrationRequest;
    const user = body.user;
    const cred = attestationResponseMarshaller.unmarshal(
      body.attestation,
    );

    const attestationExpectation: AttestationExpectation = {
      challenge: sc.getString(REG_CHALLENGE_COOKIE_KEY) || "",
      origin: sc.url.origin,
      factor: "either",
    };
    try {
      const regResult = await authLib.validateRegistration(
        user,
        cred,
        attestationExpectation,
      );
      console.log(new Date(), "register", regResult);
      sc.remove(REG_CHALLENGE_COOKIE_KEY);
      sc.remove(AUTH_CHALLENGE_COOKIE_KEY);
      return sc.toResponse(
        new Response(null, {
          status: 204,
        }),
      );
    } catch (x) {
      return new Response(x, {
        status: 400,
      });
    }
  },
};
