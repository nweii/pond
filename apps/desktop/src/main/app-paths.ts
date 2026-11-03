import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { electronApi } from "./electron-api";

type AppPathName = "home" | "userData" | "logs";

export function sandboxAppPaths(sandbox: string) {
  const root = resolve(sandbox);
  return {
    userData: join(root, "app-data"),
    sessionData: join(root, "chromium"),
    logs: join(root, "logs"),
    home: join(root, "home"),
  } as const;
}

/** Electron's default locations for an app named Pond, for processes without Electron's `app`. */
export function defaultAppPath(
  name: AppPathName,
  platform: NodeJS.Platform,
  env: NodeJS.ProcessEnv,
  home: string,
): string {
  if (name === "home") return home;
  if (platform === "darwin") {
    return name === "userData"
      ? join(home, "Library", "Application Support", "Pond")
      : join(home, "Library", "Logs", "Pond");
  }
  const appData =
    platform === "win32"
      ? (env.APPDATA ?? join(home, "AppData", "Roaming"))
      : (env.XDG_CONFIG_HOME ?? join(home, ".config"));
  const userData = join(appData, "Pond");
  return name === "userData" ? userData : join(userData, "logs");
}

export function appPath(name: AppPathName): string {
  if (electronApi.app) return electronApi.app.getPath(name);
  const sandbox = process.env.POND_SANDBOX;
  if (sandbox) return sandboxAppPaths(sandbox)[name];
  return defaultAppPath(name, process.platform, process.env, homedir());
}
