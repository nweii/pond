import log from "electron-log/main.js";
import { appPath } from "./app-paths";
import { startPondMcp } from "./core/agent/mcp";
import { ensureDefaultLibrary } from "./core/ensure-default-library";
import { bundledFfmpegPath, FFMPEG_PATH_ENV } from "./core/refresh/binaries";
import { closeDb } from "./db";
import { resolveLogFile } from "./logging";
import { resolvePaths } from "./paths";

export async function startStandaloneMcp(version: string): Promise<void> {
  /** stdout carries JSON-RPC, so nothing logs to the console. */
  log.transports.console.level = false;
  const logFile = resolveLogFile({
    getPath: appPath,
    setAppLogsPath: () => {},
  });
  if (logFile) log.transports.file.resolvePathFn = () => logFile;
  else log.transports.file.level = false;

  /** Without Electron's `app`, the resolver can't tell a packaged build, so ffmpeg is handed over the way queue workers receive it. */
  process.env[FFMPEG_PATH_ENV] ??= bundledFfmpegPath();

  try {
    ensureDefaultLibrary();
    resolvePaths();
  } catch (error) {
    log.error("[pond mcp] Library is unreadable", error);
    process.exit(1);
  }
  await startPondMcp(version, () => {
    closeDb();
    process.exit(0);
  });
}
