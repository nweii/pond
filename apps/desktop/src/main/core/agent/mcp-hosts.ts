import { existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { z } from "zod";
import {
  MCP_DETECTED_CLIENTS,
  MCP_HOST_CATALOG,
  type McpClientStatus,
  type McpConnection,
  type McpDeeplinkHost,
  type McpHostId,
} from "../../../shared/mcp-hosts";

const McpConfigSchema = z.object({
  mcpServers: z.record(z.string(), z.unknown()),
});

const MCP_LAUNCHER = "pond-mcp";

/** On macOS, launching the app binary registers a Pond app with the Dock for every MCP client, so clients start the background launcher instead. */
function pondMcpCommand(): string {
  if (process.platform !== "darwin") return process.execPath;
  const launcher = join(process.resourcesPath, MCP_LAUNCHER);
  return existsSync(launcher) ? launcher : process.execPath;
}

export function pondMcpSnippet(
  command = pondMcpCommand(),
  args: string[] = ["--mcp"],
) {
  return {
    command,
    args,
    json: JSON.stringify({ mcpServers: { pond: { command, args } } }, null, 2),
  };
}

export function mcpInstallUrl(
  id: McpHostId,
  command: string,
  args: string[],
): string | null {
  if (id === "cursor") {
    const config = Buffer.from(JSON.stringify({ command, args })).toString(
      "base64",
    );
    return `cursor://anysphere.cursor-deeplink/mcp/install?name=pond&config=${encodeURIComponent(config)}`;
  }
  if (id === "vscode") {
    return `vscode:mcp/install?${encodeURIComponent(JSON.stringify({ name: "pond", command, args }))}`;
  }
  return null;
}

export function mcpDeeplinkUrl(id: McpDeeplinkHost): string | null {
  return mcpInstallUrl(id, pondMcpCommand(), ["--mcp"]);
}

/** People rename the server, so a launch path pointing at Pond counts as connected too. */
export function configListsPond(text: string): boolean {
  try {
    const config = McpConfigSchema.safeParse(JSON.parse(text));
    if (!config.success) return false;
    return Object.entries(config.data.mcpServers).some(
      ([name, server]) =>
        name.toLowerCase() === "pond" ||
        JSON.stringify(server).toLowerCase().includes("pond"),
    );
  } catch {
    return false;
  }
}

const CODEX_POND_SERVER =
  /^\s*(\[mcp_servers\.["']?pond["']?\]|command\s*=.*pond)/im;

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Matches a server whose `command` is exactly `command`, in JSON or in Codex's TOML. */
function startsCommand(text: string, format: "json" | "toml", command: string) {
  const value = escapeRegExp(JSON.stringify(command));
  const pattern =
    format === "json"
      ? `"command"\\s*:\\s*${value}`
      : `(?:^|[{,])[ \\t]*command[ \\t]*=[ \\t]*(?:${value}|${escapeRegExp(`'${command}'`)})`;
  return new RegExp(pattern, "m").test(text);
}

export function pondConnection(
  text: string,
  format: "json" | "toml",
  appBinary: string,
  command: string,
): McpConnection {
  const listed =
    format === "json" ? configListsPond(text) : CODEX_POND_SERVER.test(text);
  if (!listed) return "none";
  const outdated =
    command !== appBinary &&
    startsCommand(text, format, appBinary) &&
    !startsCommand(text, format, command);
  return outdated ? "outdated" : "connected";
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

/** A client's config folder exists once it has run, even before any MCP server is added. */
export async function mcpClientStatus(): Promise<McpClientStatus[]> {
  return Promise.all(
    MCP_DETECTED_CLIENTS.map(async (id) => {
      const host = MCP_HOST_CATALOG.find((entry) => entry.id === id);
      if (!host) return { id, installed: false, connection: "none" };
      const raw =
        process.platform === "win32"
          ? (host.windowsConfigPath ?? host.configPath)
          : host.configPath;
      const path = raw
        .replace(/^~/, homedir())
        .replace("%APPDATA%", process.env.APPDATA ?? "");
      if (!(await exists(dirname(path)))) {
        return { id, installed: false, connection: "none" };
      }
      const text = await readFile(path, "utf8").catch(() => "");
      const connection = pondConnection(
        text,
        path.endsWith(".toml") ? "toml" : "json",
        process.execPath,
        pondMcpCommand(),
      );
      return { id, installed: true, connection };
    }),
  );
}
