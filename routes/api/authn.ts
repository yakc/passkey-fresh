import { Handlers } from "$fresh/server.ts";
import { assertionResponseMarshaller } from "lib/IsoAuthLib.ts";
import {
  AssertionExpectation,
  AUTH_CHALLENGE_COOKIE_KEY,
  REG_CHALLENGE_COOKIE_KEY,
} from "lib/AuthLib.ts";
import { authLib } from "lib/AuthLibInstance.ts";
import { CredStore } from "lib/CredStore.ts";
import { SessionCookie } from "lib/SessionCookie.ts";
import { Marshaller } from "lib/Marshaller.ts";

export const handler: Handlers = {
  async POST(req) {
    const sc = await SessionCookie.fromRequest(req);
    const body = assertionResponseMarshaller.unmarshal(
      JSON.parse(await req.text()),
    );
    const userHandle = (body.response as AuthenticatorAssertionResponse)
      .userHandle!;
    // console.log("authn", body);
    // const dec = new TextDecoder();
    // const clientData = JSON.parse(dec.decode(body.response.clientDataJSON));
    // console.log("clientData", clientData);

    const store = await CredStore.load();
    const cred = await store.find(Marshaller.encode(userHandle));

    const assertionExpectation: AssertionExpectation = {
      // Remove the following comment if allowCredentials has been added into authnOptions so the credential received will be validate against allowCredentials array.
      // allowCredentials: [{
      //     id: "lTqW8H/lHJ4yT0nLOvsvKgcyJCeO8LdUjG5vkXpgO2b0XfyjLMejRvW5oslZtA4B/GgkO/qhTgoBWSlDqCng4Q==",
      //     type: "public-key",
      //     transports: ["usb"]
      // }],
      challenge: sc.getString(AUTH_CHALLENGE_COOKIE_KEY) || "",
      origin: sc.url.origin,
      factor: "either",
      publicKey: cred.publicKeyPem,
      prevCounter: cred.counter,
      userHandle: Marshaller.encode(userHandle),
    };
    try {
      const regResult = await authLib.validateAuthentication(
        body,
        assertionExpectation,
      );
      console.log(new Date(), "authenticate", regResult);
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
