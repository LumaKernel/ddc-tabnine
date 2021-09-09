import { Denops, fn } from "./deps.ts";
import * as internal from "./internal_autoload_fn.ts";
import { TabNine } from "./tabnine/client_base.ts";
import theClient from "./the_client.ts";
import { getStorageDir } from "./storage_dir.ts";

const dispatcherNames = {
  DDC_TABNINE_RESTART: "ddc_tabnine_restart",
  DDC_TABNINE_REINSTALL: "ddc_tabnine_reinstall",
  DDC_TABNINE_CLEAN: "ddc_tabnine_clean",
  DDC_TABNINE_WHICH: "ddc_tabnine_which",
  DDC_TABNINE_VERSION: "ddc_tabnine_version",
  DDC_TABNINE_CONFIG_DIR: "ddc_tabnine_config_dir",
} as const;

export async function main(denops: Denops): Promise<void> {
  denops.dispatcher = {
    async [dispatcherNames.DDC_TABNINE_RESTART](): Promise<void> {
      const client = await theClient.getClient(await getStorageDir(denops));
      await client.restartChild();
    },
    async [dispatcherNames.DDC_TABNINE_REINSTALL](): Promise<void> {
      const storageDir = await getStorageDir(denops);
      const client = await theClient.getClient(storageDir);
      await client.cleanAllVersions();
      await theClient.getClient(storageDir);
    },
    async [dispatcherNames.DDC_TABNINE_CLEAN](): Promise<void> {
      const storageDir = await getStorageDir(denops);
      const client = await theClient.getClient(storageDir);
      await client.cleanAllVersions();
    },
    async [dispatcherNames.DDC_TABNINE_WHICH](): Promise<void> {
    },
    async [dispatcherNames.DDC_TABNINE_VERSION](): Promise<string | null> {
      const client = await theClient.getClient(await getStorageDir(denops));
      return await client.requestVersion();
    },
    async [dispatcherNames.DDC_TABNINE_CONFIG_DIR](): Promise<string | null> {
      const client = await theClient.getClient(await getStorageDir(denops));
      return await client.requestConfigDir();
    },
  };
}
