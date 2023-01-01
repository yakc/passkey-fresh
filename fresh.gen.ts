// DO NOT EDIT. This file is generated by fresh.
// This file SHOULD be checked into source version control.
// This file is automatically updated during development when running `dev.ts`.

import config from "./deno.json" assert { type: "json" };
import * as $0 from "./routes/api/authn.ts";
import * as $1 from "./routes/api/logout.ts";
import * as $2 from "./routes/api/register.ts";
import * as $3 from "./routes/index.tsx";
import * as $$0 from "./islands/AuthForm.tsx";

const manifest = {
  routes: {
    "./routes/api/authn.ts": $0,
    "./routes/api/logout.ts": $1,
    "./routes/api/register.ts": $2,
    "./routes/index.tsx": $3,
  },
  islands: {
    "./islands/AuthForm.tsx": $$0,
  },
  baseUrl: import.meta.url,
  config,
};

export default manifest;
