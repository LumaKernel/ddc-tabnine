import type { Denops } from "./deps.ts";
import { path, vars, xdg } from "./deps.ts";
import theClient from "./the_client.ts";
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
  const defaultStorageDir = path.join(
    xdg.cache(),
    "ddc-tabnine",
    "binaries",
  );

  async function getStorageDir(): Promise<string> {
    const userStorageDir = await vars.g.get(
      denops,
      "ddc_tabnine#storage_dir",
    );
    const storageDir = typeof userStorageDir === "string"
      ? userStorageDir
      : defaultStorageDir;
    return storageDir;
  }

  async function getDisableAutoInstall(): Promise<boolean> {
    const userDisableAutoInstall = await vars.g.get(
      denops,
      "ddc_tabnine#disable_auto_install",
    );
    return Boolean(userDisableAutoInstall);
  }

  denops.dispatcher = {
    async [dispatcherNames.DDC_TABNINE_RESTART](): Promise<void> {
      const storageDirAsync = getStorageDir();
      const disableAutoInstallAsync = getDisableAutoInstall();
      const client = await theClient.getClient(
        await storageDirAsync,
        await disableAutoInstallAsync,
      );
      await client.restartProc();
    },
    async [dispatcherNames.DDC_TABNINE_REINSTALL](): Promise<void> {
      const storageDirAsync = getStorageDir();
      const disableAutoInstallAsync = getDisableAutoInstall();
      await theClient.reinstall(await storageDirAsync);
      const client = await theClient.getClient(
        await storageDirAsync,
        await disableAutoInstallAsync,
      );
      await client.restartProc();
    },
    async [dispatcherNames.DDC_TABNINE_IS_RUNNING](): Promise<boolean> {
      const storageDirAsync = getStorageDir();
      const disableAutoInstallAsync = getDisableAutoInstall();
      const client = await theClient.getClient(
        await storageDirAsync,
        await disableAutoInstallAsync,
      );
      return client.isRunning();
    },
    async [dispatcherNames.DDC_TABNINE_WHICH](): Promise<string | null> {
      const storageDirAsync = getStorageDir();
      const disableAutoInstallAsync = getDisableAutoInstall();
      const client = await theClient.getClient(
        await storageDirAsync,
        await disableAutoInstallAsync,
      );
      return client.getRunningBinaryPath();
    },
    async [dispatcherNames.DDC_TABNINE_VERSION](): Promise<string | null> {
      const storageDirAsync = getStorageDir();
      const disableAutoInstallAsync = getDisableAutoInstall();
      const client = await theClient.getClient(
        await storageDirAsync,
        await disableAutoInstallAsync,
      );
      return await client.requestVersion();
    },
    async [dispatcherNames.DDC_TABNINE_CONFIG_DIR](): Promise<string | null> {
      const storageDirAsync = getStorageDir();
      const disableAutoInstallAsync = getDisableAutoInstall();
      const client = await theClient.getClient(
        await storageDirAsync,
        await disableAutoInstallAsync,
      );
      return await client.requestConfigDir();
    },
    async [dispatcherNames.DDC_TABNINE_INTERNAL_REQUEST_AUTOCOMPLETE](
      reqUnknown: unknown,
    ): Promise<TabNineV2AutoCompleteResponse> {
      // deno-lint-ignore no-explicit-any
      const req: TabNineV2AutoCompleteRequest = reqUnknown as any;
      const storageDirAsync = getStorageDir();
      const disableAutoInstallAsync = getDisableAutoInstall();
      const client = await theClient.getClient(
        await storageDirAsync,
        await disableAutoInstallAsync,
      );
      return await client.requestAutocomplete(req);
    },
  };
}
