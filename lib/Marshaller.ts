// deno-lint-ignore-file no-explicit-any

export interface Vivifier<U> {
  vivify(obj: Record<string, any>): U;
}

export class Marshaller<U, M> {
  #fields = new Set<string>();
  #nested = new Map<string, Marshaller<any, any>>();

  constructor(readonly vivifier?: Vivifier<U>) {}

  fields(...names: string[]): this {
    for (const n of names) {
      this.#fields.add(n);
    }
    return this;
  }

  nested(name: string, marshaller: Marshaller<any, any>): this {
    this.#nested.set(name, marshaller);
    return this;
  }

  marshal(obj: U): M {
    const ret: Record<string, any> = {};
    for (const k in obj) {
      const f = obj[k];
      const m = this.#nested.get(k);
      if (m) {
        if (Array.isArray(f)) {
          ret[k] = f.map(m.marshal.bind(m));
        } else {
          ret[k] = m.marshal(f);
        }
      } else if (this.#fields.has(k)) {
        if (Array.isArray(f)) {
          ret[k] = f.map(Marshaller.encode);
        } else if (f instanceof ArrayBuffer || ArrayBuffer.isView(f)) {
          ret[k] = Marshaller.encode(f);
        } else {
          throw `${k} is neither an ArrayBuffer nor a view`;
        }
      } else {
        ret[k] = f;
      }
    }
    return ret as M;
  }

  static encode(binary: ArrayBuffer | ArrayBufferView): string {
    const u = binary instanceof Uint8Array
      ? binary
      : new Uint8Array(binary instanceof ArrayBuffer ? binary : binary.buffer);
    return btoa(Array.from(u, (b) => String.fromCharCode(b)).join(""));
  }

  unmarshal(obj: M): U {
    const ret: Record<string, any> = {};
    for (const k in obj) {
      const f = obj[k];
      const m = this.#nested.get(k);
      if (m) {
        if (Array.isArray(f)) {
          ret[k] = f.map(m.unmarshal.bind(m));
        } else {
          ret[k] = m.unmarshal(f);
        }
      } else if (this.#fields.has(k)) {
        if (Array.isArray(f)) {
          ret[k] = f.map(Marshaller.decode);
        } else if (typeof f === "string") {
          ret[k] = Marshaller.decode(f);
        } else {
          throw `${k} is not a string`;
        }
      } else {
        ret[k] = f;
      }
    }
    return this.vivifier ? this.vivifier.vivify(ret) : ret as U;
  }

  static decode(f: string): ArrayBuffer {
    return Uint8Array.from(atob(f), (c) => c.charCodeAt(0)).buffer;
  }
}
