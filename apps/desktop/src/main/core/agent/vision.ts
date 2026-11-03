import { extname } from "node:path";
import type { ProviderModel } from "../../../shared/provider-models";
import { resolveSaveFilePath } from "../../ipc/helpers";
import { readLibraryMedia } from "../storage/library-media-storage";

const MIME = new Map<string, string>(
  Object.entries({
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
  }),
);

export function visionEnabled(
  model: Pick<ProviderModel, "modelCapabilities"> | undefined,
): boolean {
  return model?.modelCapabilities?.vision === true;
}

export async function imagesForSaves(
  ids: string[],
): Promise<Array<{ mimeType: string; data: string }>> {
  const images: Array<{ mimeType: string; data: string }> = [];
  for (const id of ids.slice(0, 24)) {
    const target = await resolveSaveFilePath(id, 0);
    if (!target.ok) continue;
    const mime = MIME.get(extname(target.path).toLowerCase());
    if (!mime) continue;
    images.push({
      mimeType: mime,
      data: (await readLibraryMedia(target.path)).toString("base64"),
    });
  }
  return images;
}
