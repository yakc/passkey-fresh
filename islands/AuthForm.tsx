import { useState } from "preact/hooks";
import {
  assertionResponseMarshaller,
  attestationResponseMarshaller,
  AuthAttestationOptions,
  challengeMarshaller,
  deriveUserHandle,
  MarshalledAssertionOptions,
  MarshalledAttestationOptions,
  RegistrationRequest,
} from "lib/IsoAuthLib.ts";
import { Button } from "../components/Button.tsx";
import { Marshaller } from "lib/Marshaller.ts";

export interface AuthData {
  registrationOptions: MarshalledAttestationOptions;
  authnOptions: MarshalledAssertionOptions;
}

export default function AuthForm(data: AuthData) {
  const [username, setUsername] = useState("");

  return (
    <form>
      <input
        type="email"
        placeholder="email to register"
        name="username"
        autocomplete="username webauthn"
        value={username}
        onChange={(e) => {
          setUsername(e.currentTarget.value.trim());
        }}
        onKeyPress={(e) => {
          if (e.key == "Enter") {
            const self = e.currentTarget;
            const row = self.closest("form");
            const b = row!.querySelector(
              `button`,
            ) as HTMLButtonElement;
            self.blur();
            setTimeout(() => {
              b.click();
              setTimeout(() => self.focus());
            });
          }
        }}
      />
      <Button
        type="button"
        onClick={async (e) => {
          // if (!data.registrationOptions) {
          //   return;
          // }
          const options = challengeMarshaller.unmarshal(
            data.registrationOptions,
          ) as AuthAttestationOptions;
          const rp = options.rp.id || options.rp.name;
          options.user.name = username || "my-name";
          options.user.displayName = "my-display";
          options.user.id = await deriveUserHandle(options.user.name, rp);
          try {
            const clientAttestationResponse = await navigator.credentials
              .create({ publicKey: options });
            console.log("clientAttestationResponse", clientAttestationResponse);
            if (clientAttestationResponse instanceof PublicKeyCredential) {
              const regReq: RegistrationRequest = {
                attestation: attestationResponseMarshaller.marshal(
                  clientAttestationResponse,
                ),
                user: Marshaller.encode(options.user.id),
              };
              const res = await fetch(
                new Request("/api/register", {
                  method: "POST",
                  body: JSON.stringify(regReq),
                }),
              );
              console.log("response", res);
            } else {
              throw `navigator.credentials.create returned an [${
                Object.prototype.toString.call(clientAttestationResponse)
              }], not a PublicKeyCredential`;
            }
          } catch (x) {
            if (x instanceof DOMException && x.name === "NotAllowedError") {
              console.log("navigator.credentials.create:", x.message);
            } else {
              throw x;
            }
          }
        }}
      >
        Register
      </Button>
      <Button
        type="button"
        onClick={async (e) => {
          // if (!data.authnOptions) {
          //   return;
          // }
          const options = challengeMarshaller.unmarshal(data.authnOptions);
          try {
            const clientAssertionResponse = await navigator.credentials
              .get({ publicKey: options });
            console.log("clientAssertionResponse", clientAssertionResponse);
            if (clientAssertionResponse instanceof PublicKeyCredential) {
              const res = await fetch(
                new Request("/api/authn", {
                  method: "POST",
                  body: JSON.stringify(
                    assertionResponseMarshaller.marshal(
                      clientAssertionResponse,
                    ),
                  ),
                }),
              );
              console.log("response", res);
            } else {
              throw `navigator.credentials.create returned an [${
                Object.prototype.toString.call(clientAssertionResponse)
              }], not a PublicKeyCredential`;
            }
          } catch (x) {
            if (x instanceof DOMException && x.name === "NotAllowedError") {
              console.log("navigator.credentials.get:", x.message);
            } else {
              throw x;
            }
          }
        }}
      >
        Authenticate
      </Button>
    </form>
  );
}
