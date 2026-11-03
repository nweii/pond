import * as electron from "electron";

/** The macOS MCP server runs main code as plain Node, where `electron` is an empty module. */
export const electronApi: Partial<typeof electron> = electron;
