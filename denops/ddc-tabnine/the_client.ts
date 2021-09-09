import { Mutex } from "../ddc-tabnine/deps.ts";
import { TabNineV2 } from "./tabnine/client_v2.ts";

class ClientCreator {
  private client?: TabNineV2;
  private clientCloser?: () => void;
  private mutex = new Mutex();
  private clientStorageDir?: string;

  private recreateClient(storageDir: string): TabNineV2 {
    this.clientCloser?.();
    this.client = undefined;
    this.clientCloser = undefined;
    this.clientStorageDir = storageDir;
    const newClient = this.client = new TabNineV2(
      "ddc.vim",
      storageDir,
    );
    this.clientCloser = () => newClient.close();
    return this.client;
  }

  async reinstall(storageDir: string): Promise<void> {
    const release = await this.mutex.acquire();
    try {
      const client = await this.getClientUnlocked(storageDir);
      await client.cleanAllVersions();
      await client.installTabNine(await TabNineV2.getLatestVersion());
    } finally {
      release();
    }
  }

  async getClient(storageDir: string): Promise<TabNineV2> {
    const release = await this.mutex.acquire();
    try {
      return await this.getClientUnlocked(storageDir);
    } finally {
      release();
    }
  }

  async getClientUnlocked(storageDir: string): Promise<TabNineV2> {
    if (!this.client || storageDir !== this.clientStorageDir) {
      if (this.clientStorageDir && storageDir !== this.clientStorageDir) {
        console.log("[ddc-tabnine] Storage dir is updated. Restarting...");
      }
      const client = this.recreateClient(storageDir);
      const version = await TabNineV2.getLatestVersion();
      if (!(await client.isInstalled(version))) {
        console.log(
          `[ddc-tabnine] Installing TabNine cli version ${version}...`,
        );
        try {
          await client.installTabNine(version);
        } catch (e: unknown) {
          try {
            console.error(
              `[ddc-tabnine] Failed to install TabNine cli version ${version}.`,
            );
          } finally {
            await client.cleanVersion(version);
          }
          throw e;
        }
      }
      await client.restartProc();
      return client;
    }
    return this.client;
  }
}

// Singleton client. To make this a real singleton, use the client
// from other denops plugins only via denops.dispatch().
const theClient = new ClientCreator();
export default theClient;
