import { describe, expect, it } from "vitest";
import { defaultAppPath, sandboxAppPaths } from "./app-paths";

describe("app paths without Electron", () => {
  it("matches Electron's locations for Pond on macOS", () => {
    expect(defaultAppPath("userData", "darwin", {}, "/Users/ada")).toBe(
      "/Users/ada/Library/Application Support/Pond",
    );
    expect(defaultAppPath("logs", "darwin", {}, "/Users/ada")).toBe(
      "/Users/ada/Library/Logs/Pond",
    );
    expect(defaultAppPath("home", "darwin", {}, "/Users/ada")).toBe(
      "/Users/ada",
    );
  });

  it("follows APPDATA and XDG_CONFIG_HOME on other platforms", () => {
    expect(
      defaultAppPath("userData", "win32", { APPDATA: "/roaming" }, "/home"),
    ).toBe("/roaming/Pond");
    expect(
      defaultAppPath("logs", "linux", { XDG_CONFIG_HOME: "/xdg" }, "/home"),
    ).toBe("/xdg/Pond/logs");
  });

  it("keeps a sandboxed app and its MCP server in one profile", () => {
    expect(sandboxAppPaths("/tmp/sandbox")).toEqual({
      userData: "/tmp/sandbox/app-data",
      sessionData: "/tmp/sandbox/chromium",
      logs: "/tmp/sandbox/logs",
      home: "/tmp/sandbox/home",
    });
  });
});
