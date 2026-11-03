import { app } from "electron";
import log from "electron-log/main.js";
import { getPrefs, invalidatePrefs } from "./core/prefs";
import { startHttpServer } from "./http/server";
import { createRuntimeControls } from "./runtime-controls";
import { setTrayVisible } from "./tray";
import { setCloseToTray } from "./window";

/** Windows has no wasOpenedAtLogin, so the login item passes this flag instead. */
export const LOGIN_LAUNCH_ARG = "--hidden";
/** An MCP process passing on a Dock click: the user asked to see Pond, so a window opens even when Pond launches hidden. */
export const REOPEN_ARG = "--reopen";

export const runtimeControls = createRuntimeControls({
  getPrefs,
  invalidatePrefs,
  startHttpServer,
  setTrayVisible,
  isPackaged: app.isPackaged,
  setLoginItemSettings: (settings) =>
    app.setLoginItemSettings(
      process.platform === "win32"
        ? { ...settings, args: [LOGIN_LAUNCH_ARG] }
        : settings,
    ),
  setCloseToTray,
  async applyAppIcon(icon) {
    const { applyAppIcon } = await import("./core/app-icon");
    await applyAppIcon(icon);
  },
  warn: (message, error) => log.warn(message, error),
});
