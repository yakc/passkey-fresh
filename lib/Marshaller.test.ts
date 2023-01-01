import { assertEquals } from "std/testing/asserts.ts";
import { Marshaller } from "./Marshaller.ts";

Deno.test("Marshaller.encode", () => {
  assertEquals(btoa("abc"), "YWJj");
  assertEquals(Marshaller.encode(new TextEncoder().encode("abc")), "YWJj");
});

Deno.test("Marshaller.marshal", () => {
  const m = new Marshaller().fields("bin");
  const o = {
    num: 123,
    txt: "xyz",
    bin: new TextEncoder().encode("def").buffer,
  };
  assertEquals(m.marshal(o), {
    num: 123,
    txt: "xyz",
    bin: "ZGVm",
  });
});

Deno.test("Marshaller.decode", () => {
  assertEquals(atob("YWJj"), "abc");
  assertEquals(
    Marshaller.decode("YWJj"),
    new TextEncoder().encode("abc").buffer,
  );
});

Deno.test("Marshaller.unmarshal", () => {
  const m = new Marshaller().fields("bin");
  const o = {
    num: 123,
    txt: "xyz",
    bin: "ZGVm",
  };
  assertEquals(m.unmarshal(o), {
    num: 123,
    txt: "xyz",
    bin: new TextEncoder().encode("def").buffer,
  });
});
