import type { Handlers, PageProps } from "$fresh/server.ts";
import {
  AUTH_CHALLENGE_COOKIE_KEY,
  AuthRegistrationWrapper,
  REG_CHALLENGE_COOKIE_KEY,
  RegistrationSuccess,
} from "lib/AuthLib.ts";
import { authLib } from "lib/AuthLibInstance.ts";
import { CredStore } from "lib/CredStore.ts";
import AuthForm from "../islands/AuthForm.tsx";
import { MarshalledAssertionOptions } from "lib/IsoAuthLib.ts";
import { SessionCookie } from "../lib/SessionCookie.ts";

interface Data {
  isAllowed: boolean;
  registrationOptions: AuthRegistrationWrapper;
  authnOptions: MarshalledAssertionOptions;
  cred: RegistrationSuccess;
}

export const handler: Handlers = {
  async GET(req, ctx) {
    const sc = await SessionCookie.fromRequest(req);
    const userHandle = sc.getString("userHandle") || "";
    const store = await CredStore.load();
    const cred = await store.find(userHandle);
    const data: Data = {
      isAllowed: !!userHandle,
      cred,
      authnOptions: await authLib.authnOptions(),
      registrationOptions: await authLib.registrationOptions(),
    };
    sc.setString(
      AUTH_CHALLENGE_COOKIE_KEY,
      data.authnOptions.challenge,
    );
    sc.setBytes(
      REG_CHALLENGE_COOKIE_KEY,
      data.registrationOptions.options.challenge,
    );
    // console.log("index data", data);

    return sc.toResponse(await ctx.render(data));
  },
};

export default function Home({ data }: PageProps<Data>) {
  return (
    <div>
      You currently {data.isAllowed ? "are" : "are not"} logged in.
      {data.isAllowed ? <a href="/api/logout">Logout</a> : (
        <AuthForm
          registrationOptions={data.registrationOptions?.marshall()}
          authnOptions={data.authnOptions}
        />
      )}
    </div>
  );
}
