import { getCookies, setCookie } from "std/http/cookie.ts";
import { CredStore } from "./CredStore.ts";
import { Marshaller } from "./Marshaller.ts";

export const COOKIE_NAME = "SESSION";
const ALGORITHM = "AES-GCM";

const key = (async (store: Promise<CredStore>) =>
  crypto.subtle.importKey(
    "raw",
    await (await store).aesKey(),
    { name: ALGORITHM },
    false,
    ["encrypt", "decrypt"],
  ))(CredStore.load());

/**
 * Stateless encrypted client-side only session cookie.
 */
export class SessionCookie {
  readonly #dict: Record<string, string> = {};

  private constructor(readonly url: URL) {}

  async #decode(cookie: string) {
    try {
      const [iv, bytes] = cookie.split(":");
      const dict = JSON.parse(
        new TextDecoder().decode(
          await crypto.subtle.decrypt(
            { name: ALGORITHM, iv: Marshaller.decode(iv) },
            await key,
            Marshaller.decode(bytes),
          ),
        ),
      );
      Object.assign(this.#dict, dict);
    } catch (x) {
      console.warn(`decode ${COOKIE_NAME} cookie`, x);
    }
  }

  async #encode(): Promise<string> {
    const iv = crypto.getRandomValues(new Uint8Array(16));
    const bytes = await crypto.subtle.encrypt(
      { name: ALGORITHM, iv },
      await key,
      new TextEncoder().encode(JSON.stringify(this.#dict)),
    );
    return Marshaller.encode(iv) + ":" + Marshaller.encode(bytes);
  }

  setString(key: string, value: string) {
    this.#dict[key] = value;
  }

  getString(key: string): string | undefined {
    return this.#dict[key];
  }

  setBytes(key: string, value: ArrayBufferLike) {
    this.#dict[key] = Marshaller.encode(value);
  }

  getBytes(key: string): ArrayBuffer | undefined {
    const v = this.#dict[key];
    if (v === undefined) {
      return undefined;
    }
    return Marshaller.decode(v);
  }

  setJSON(key: string, value: Record<string, unknown> | Array<unknown>) {
    this.#dict[key] = JSON.stringify(value);
  }

  getJSON(key: string) {
    const v = this.#dict[key];
    if (v === undefined) {
      return undefined;
    }
    return JSON.parse(v);
  }

  remove(key: string) {
    delete this.#dict[key];
  }

  async toResponse(response: Response): Promise<Response> {
    setCookie(response.headers, {
      name: COOKIE_NAME,
      value: await this.#encode(),
      maxAge: 120,
      sameSite: "Strict",
      domain: this.url.hostname,
      path: "/",
      secure: this.url.protocol === "https",
      httpOnly: true,
    });
    return response;
  }

  static async fromRequest(request: Request) {
    const url = new URL(request.url);
    const sc = new SessionCookie(url);
    const cookie = getCookies(request.headers)[COOKIE_NAME];
    if (cookie) {
      await sc.#decode(cookie);
    }
    return sc;
  }
}
