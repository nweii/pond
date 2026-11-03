import { createRequire, registerHooks } from "node:module";
import { z } from "zod";

/**
 * Plain Node has no CommonJS `electron`, which electron-log requires. It gets the same
 * empty module that ESM imports of `electron` receive here, so main code loads and
 * checks for Electron's APIs before using them.
 */
registerHooks({
  resolve: (specifier, context, nextResolve) =>
    specifier === "electron"
      ? { url: "pond:electron", format: "commonjs", shortCircuit: true }
      : nextResolve(specifier, context),
  load: (url, context, nextLoad) =>
    url === "pond:electron"
      ? {
          format: "commonjs",
          source: "module.exports = {};",
          shortCircuit: true,
        }
      : nextLoad(url, context),
});

const { version } = z
  .object({ version: z.string() })
  .parse(createRequire(import.meta.url)("../../package.json"));
const { startStandaloneMcp } = await import("./mcp-server-start");
await startStandaloneMcp(version);
