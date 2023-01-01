import { RegistrationSuccess } from "./AuthLib.ts";
import { Marshaller } from "./Marshaller.ts";

export interface CredData {
  aesKey: string;
  users: Array<RegistrationSuccess>;
}

export interface KayVee {
  load: () => Promise<CredData>;
  store: (data: CredData) => Promise<void>;
}

const localStorageCredStoreKey = "#local#Storage#Cred#Store#Key#";

const localKV: KayVee = {
  load(): Promise<CredData> {
    const item = localStorage.getItem(localStorageCredStoreKey);
    if (item) {
      const data = JSON.parse(item) as CredData;
      if (data.aesKey) {
        // deno-lint-ignore no-explicit-any
        data.users.forEach((u) => u.userHandle = (u as any)["reqId"]); // patch schema change
        // console.log("CredStore users", data.users.map((r) => r.userHandle));
        return Promise.resolve(data);
      }
    }
    const rawKey = crypto.getRandomValues(new Uint8Array(16));
    const data: CredData = {
      aesKey: Marshaller.encode(rawKey),
      users: [],
    };
    localStorage.setItem(localStorageCredStoreKey, JSON.stringify(data));
    return Promise.resolve(data);
  },
  store(data: CredData): Promise<void> {
    localStorage.setItem(localStorageCredStoreKey, JSON.stringify(data));
    return Promise.resolve();
  },
};

export class CredStore {
  #kv: KayVee;
  private constructor(kv: KayVee) {
    this.#kv = kv;
  }

  async store(cred: RegistrationSuccess) {
    const data = await this.#kv.load();
    const index = data.users.findIndex((u) => u.userHandle === cred.userHandle);
    if (index >= 0) {
      data.users[index] = cred;
    } else {
      data.users.push(cred);
    }
    return this.#kv.store(data);
  }

  async find(userHandle: string): Promise<RegistrationSuccess> {
    const data = await this.#kv.load();
    let cred = data.users.find((u) => u.userHandle === userHandle);
    if (!cred) {
      cred = {
        publicKeyPem: "",
        counter: 0,
        userHandle: userHandle,
      };
    }
    return cred;
  }

  async aesKey(): Promise<ArrayBuffer> {
    const data = await this.#kv.load();
    return Marshaller.decode(data.aesKey);
  }

  static async load(kv?: KayVee) {
    if (!kv) {
      kv = localKV;
    }
    await kv.load();
    return new CredStore(kv);
  }
}
