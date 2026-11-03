import { describe, expect, it } from "vitest";
import {
  hostSetupCommands,
  MCP_HOST_CATALOG,
  mcpHostConfigPath,
  pondLaunchLine,
} from "../../../shared/mcp-hosts";
import {
  configListsPond,
  mcpInstallUrl,
  pondConnection,
  pondMcpSnippet,
} from "./mcp-hosts";

const APP_BINARY = "/Applications/Pond.app/Contents/MacOS/Pond";
const LAUNCHER = "/Applications/Pond.app/Contents/Resources/pond-mcp";

describe("mcp hosts", () => {
  it("builds Claude Code setup commands from the Pond launch", () => {
    const commands = hostSetupCommands(
      "claude-code",
      "/Applications/Pond.app/Contents/MacOS/Pond",
      ["--mcp"],
    );
    expect(commands[0]?.value).toBe(
      "claude mcp add --scope user pond -- /Applications/Pond.app/Contents/MacOS/Pond --mcp",
    );
    expect(commands[1]?.value).toBe("claude mcp get pond");
  });

  it("quotes launch paths that contain spaces", () => {
    expect(
      pondLaunchLine("/Users/Raphael Salaja/Pond.app/Contents/MacOS/Pond", [
        "--mcp",
      ]),
    ).toBe('"/Users/Raphael Salaja/Pond.app/Contents/MacOS/Pond" --mcp');
  });

  it("shows Windows MCP config paths for desktop clients", () => {
    const claude = MCP_HOST_CATALOG.find(
      (host) => host.id === "claude-desktop",
    );
    const vscode = MCP_HOST_CATALOG.find((host) => host.id === "vscode");
    if (!claude || !vscode) throw new Error("Missing MCP host fixture");
    expect(mcpHostConfigPath(claude, "Win32")).toBe(
      "%APPDATA%\\Claude\\claude_desktop_config.json",
    );
    expect(mcpHostConfigPath(vscode, "Win32")).toBe(
      "%APPDATA%\\Code\\User\\mcp.json",
    );
  });

  it("builds a Cursor install URL from the Pond command", () => {
    const url = mcpInstallUrl("cursor", "/bin/pond", ["--mcp"]);
    expect(url).toContain("name=pond");
    expect(mcpInstallUrl("claude-code", "/bin/pond", ["--mcp"])).toBeNull();
  });

  it("serializes the Pond stdio snippet", () => {
    expect(pondMcpSnippet("/bin/pond", ["--mcp"]).json).toContain("--mcp");
  });

  it("finds Pond in a client config by name or launch path", () => {
    expect(configListsPond(pondMcpSnippet("/bin/pond").json)).toBe(true);
    expect(
      configListsPond(
        JSON.stringify({
          mcpServers: {
            library: {
              command: "/Applications/Pond.app/Contents/MacOS/Pond",
            },
          },
        }),
      ),
    ).toBe(true);
    expect(
      configListsPond(JSON.stringify({ mcpServers: { linear: {} } })),
    ).toBe(false);
    expect(configListsPond("")).toBe(false);
  });

  it("reports a Pond server that still starts the app binary as outdated", () => {
    const config = (command: string) =>
      JSON.stringify(
        { mcpServers: { pond: { type: "stdio", command, args: ["--mcp"] } } },
        null,
        2,
      );
    expect(
      pondConnection(config(APP_BINARY), "json", APP_BINARY, LAUNCHER),
    ).toBe("outdated");
    expect(pondConnection(config(LAUNCHER), "json", APP_BINARY, LAUNCHER)).toBe(
      "connected",
    );
    expect(
      pondConnection(config(APP_BINARY), "json", APP_BINARY, APP_BINARY),
    ).toBe("connected");
    expect(
      pondConnection('{"mcpServers":{}}', "json", APP_BINARY, LAUNCHER),
    ).toBe("none");
  });

  it("reads Pond servers from a Codex TOML config", () => {
    const codex = (command: string) =>
      `model = "gpt-5"\n\n[mcp_servers.pond]\ncommand = "${command}"\nargs = ["--mcp"]\n`;
    expect(
      pondConnection(codex(APP_BINARY), "toml", APP_BINARY, LAUNCHER),
    ).toBe("outdated");
    expect(pondConnection(codex(LAUNCHER), "toml", APP_BINARY, LAUNCHER)).toBe(
      "connected",
    );
    expect(
      pondConnection('model = "gpt-5"\n', "toml", APP_BINARY, LAUNCHER),
    ).toBe("none");
  });

  it("asks Claude Code to remove an outdated server before adding it again", () => {
    const commands = hostSetupCommands(
      "claude-code",
      LAUNCHER,
      ["--mcp"],
      "outdated",
    );
    expect(commands.map((command) => command.value)).toEqual([
      "claude mcp remove --scope user pond",
      `claude mcp add --scope user pond -- ${LAUNCHER} --mcp`,
      "claude mcp get pond",
    ]);
  });
});
