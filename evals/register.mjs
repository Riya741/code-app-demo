// Lets `node --experimental-transform-types` run the eval harness and the server code it imports: resolves the
// extensionless relative imports the project uses (`./contracts`) to their `.ts` files (EVAL-T04).
import { register } from "node:module";

register("./resolve-ts.mjs", import.meta.url);
