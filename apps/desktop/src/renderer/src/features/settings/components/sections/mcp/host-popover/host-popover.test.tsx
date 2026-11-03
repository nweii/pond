import { MCP_HOST_CATALOG } from "@shared/mcp-hosts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { HostPopover } from "./index";

const LAUNCHER = "/Applications/Pond.app/Contents/Resources/pond-mcp";

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

it("offers to replace a Claude Code server that still starts the app binary", async () => {
  const queries: string[] = [];
  vi.stubGlobal("pond", {
    query: async (name: string) => {
      queries.push(name);
      if (name === "agent.mcpClients") {
        return {
          clients: [
            { id: "claude-code", installed: true, connection: "outdated" },
          ],
        };
      }
      throw new Error(`Unexpected query: ${name}`);
    },
  });
  const claude = MCP_HOST_CATALOG.find((host) => host.id === "claude-code");
  if (!claude) throw new Error("Missing Claude Code host");
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  await act(async () =>
    root.render(
      <QueryClientProvider client={new QueryClient()}>
        <HostPopover
          host={claude}
          snippet={{ command: LAUNCHER, args: ["--mcp"], json: "{}" }}
        />
      </QueryClientProvider>,
    ),
  );
  expect(queries).toEqual([]);

  const trigger = host.querySelector("button");
  if (!trigger) throw new Error("Missing popover trigger");
  await act(async () => trigger.click());
  await act(async () => {});

  expect(queries).toEqual(["agent.mcpClients"]);
  expect(document.body.textContent).toContain("old command");
  expect(document.body.textContent).toContain(
    "claude mcp remove --scope user pond",
  );
  await act(async () => root.unmount());
});
