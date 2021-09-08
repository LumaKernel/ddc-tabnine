import {
  BaseSource,
  Candidate,
  GatherCandidatesArguments,
  path,
  xdg,
} from "../ddc-tabnine/deps.ts";
import { TabNineV2 } from "../ddc-tabnine/tabnine/client_v2.ts";
import { getAround } from "../ddc-tabnine/internal_autoload_fs.ts";
import { Mutex } from "https://deno.land/x/semaphore@v1.1.0/mod.ts";

type Params = {
  maxSize: number;
  maxNumResults: number;
  storageDir: string;
};

export class Source extends BaseSource {
  static readonly defaultStorageDir = path.join(
    xdg.cache(),
    "ddc-tabnine",
  );
  static readonly defaultParams: Readonly<Params> = {
    maxSize: 200,
    maxNumResults: 5,
    storageDir: Source.defaultStorageDir,
  };

  private client?: TabNineV2;
  private clientCloser?: () => void;
  private mutex: Mutex = new Mutex();

  private recreateClient() {
    const oldClient = this.client;
    const oldClientCloser = this.clientCloser;
    this.client = undefined;
    this.clientCloser = undefined;
    oldClient?.close();
    const newClient = this.client = new TabNineV2(
      "ddc.vim",
      Source.defaultStorageDir,
    );
    this.clientCloser = () => newClient.close();
    return this.client;
  }

  private async getClient(): Promise<TabNineV2> {
    const release = await this.mutex.acquire();
    try {
      return await this.getClientUnlocked();
    } finally {
      release();
    }
  }

  private async getClientUnlocked(): Promise<TabNineV2> {
    if (!this.client) {
      const client = this.recreateClient();
      const version = await TabNineV2.getTabNineLatestVersion();
      if (!(await client.isInstalled(version))) {
        console.log(
          `[ddc-tabnine] Installing TabNine cli version ${version}...`,
        );
        try {
          await client.installTabNine(version);
        } catch (e: unknown) {
          try {
            console.error(
              `[ddc-tabnine] Failed to TabNine cli version ${version}.`,
            );
          } finally {
            await client.cleanTabNine(version);
            throw e;
          }
        }
      }
      return client;
    }
    return this.client;
  }

  async gatherCandidates(
    args: GatherCandidatesArguments,
  ): Promise<Candidate[]> {
    const p = args.sourceParams as Partial<Params>;

    const [
      filename,
      before,
      after,
      regionIncludesBeginning,
      regionIncludesEnd,
    ] = await getAround(args.denops, p.maxSize || Source.defaultParams.maxSize);

    const client = await this.getClient();
    const res = await client.requestAutocomplete({
      maxNumResults: p.maxNumResults || Source.defaultParams.maxNumResults,
      filename,
      before,
      after,
      regionIncludesBeginning,
      regionIncludesEnd,
    });
    const cs: Candidate[] =
      res?.results?.filter((e) => e?.new_prefix).map((e) => ({
        word: e.new_prefix,
        abbr: e.detail && `${e.new_prefix}\t${e.detail}`,
      })) ?? [];
    return cs;
  }

  params(): Record<string, unknown> {
    return { ...Source.defaultParams };
  }
}
