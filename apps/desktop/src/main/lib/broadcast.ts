import { electronApi } from "../electron-api";

export function broadcast<T>(channel: string, payload: T): void {
  for (const win of electronApi.BrowserWindow?.getAllWindows() ?? []) {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, payload);
    }
  }
}
