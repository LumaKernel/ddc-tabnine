import type { Denops } from "./deps.ts";
import theClient from "./the_client.ts";
import { getStorageDir } from "./storage_dir.ts";
import type {
  TabNineV2AutoCompleteRequest,
  TabNineV2AutoCompleteResponse,
} from "./tabnine/client_v2.ts";

const dispatcherNames = {
  DDC_TABNINE_RESTART: "restart",
  DDC_TABNINE_REINSTALL: "reinstall",
  DDC_TABNINE_CLEAN: "clean",
  DDC_TABNINE_IS_RUNNING: "isRunning",
  DDC_TABNINE_WHICH: "which",
  DDC_TABNINE_VERSION: "version",
  DDC_TABNINE_CONFIG_DIR: "configDir",
  DDC_TABNINE_INTERNAL_REQUEST_AUTOCOMPLETE: "internalRequestAutocomplete",
} as const;

// deno-lint-ignore require-await
export async function main(denops: Denops): Promise<void> {
  denops.dispatcher = {
    async [dispatcherNames.DDC_TABNINE_RESTART](): Promise<void> {
      const client = await theClient.getClient(await getStorageDir(denops));
      await client.restartProc();
    },
    async [dispatcherNames.DDC_TABNINE_REINSTALL](): Promise<void> {
      const storageDir = await getStorageDir(denops);
      const client = await theClient.getClient(storageDir);
      await client.cleanAllVersions();
      await client.restartProc();
    },
    async [dispatcherNames.DDC_TABNINE_IS_RUNNING](): Promise<boolean> {
      const client = await theClient.getClient(await getStorageDir(denops));
      return client.isRunning();
    },
    async [dispatcherNames.DDC_TABNINE_WHICH](): Promise<string | null> {
      const client = await theClient.getClient(await getStorageDir(denops));
      return client.getRunningBinaryPath();
    },
    async [dispatcherNames.DDC_TABNINE_VERSION](): Promise<string | null> {
      const client = await theClient.getClient(await getStorageDir(denops));
      return await client.requestVersion();
    },
    async [dispatcherNames.DDC_TABNINE_CONFIG_DIR](): Promise<string | null> {
      const client = await theClient.getClient(await getStorageDir(denops));
      return await client.requestConfigDir();
    },
    async [dispatcherNames.DDC_TABNINE_INTERNAL_REQUEST_AUTOCOMPLETE](
      reqUnknown: unknown,
    ): Promise<TabNineV2AutoCompleteResponse> {
      // deno-lint-ignore no-explicit-any
      const req: TabNineV2AutoCompleteRequest = reqUnknown as any;
      const client = await theClient.getClient(await getStorageDir(denops));
      return await client.requestAutocomplete(req);
    },
  };
}
