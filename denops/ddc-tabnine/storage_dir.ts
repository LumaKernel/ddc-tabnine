import { Denops, path, xdg } from "./deps.ts";

export const defaultStorageDir = path.join(
  xdg.cache(),
  "ddc-tabnine",
  "binaries",
);

export async function getStorageDir(denops: Denops): Promise<string> {
  // deno-lint-ignore no-explicit-any
  const customGlobal: any = await denops.dispatch("ddc", "getGlobal");
  const storageDir = customGlobal?.sourceOptions?.tabnine?.storageDir ??
    defaultStorageDir;
  return storageDir;
}
