import {
  BaseSource,
  Candidate,
  GatherCandidatesArguments,
  path,
} from "../ddc-tabnine/deps.ts";
import {
  defaultStorageDir,
  getStorageDir,
} from "../ddc-tabnine/storage_dir.ts";
import theClient from "../ddc-tabnine/the_client.ts";
import { getAround } from "../ddc-tabnine/internal_autoload_fn.ts";

type Params = {
  maxSize: number;
  maxNumResults: number;
  storageDir: string;
};

export class Source extends BaseSource {
  static readonly defaultParams: Readonly<Params> = {
    maxSize: 200,
    maxNumResults: 5,
    storageDir: defaultStorageDir,
  };

  async gatherCandidates(
    args: GatherCandidatesArguments,
  ): Promise<Candidate[]> {
    const p = args.sourceParams as Partial<Params>;

    const [
      [
        filename,
        before,
        after,
        regionIncludesBeginning,
        regionIncludesEnd,
      ],
      storageDir,
    ] = await Promise.all([
      getAround(args.denops, p.maxSize || Source.defaultParams.maxSize),
      getStorageDir(args.denops),
    ]);
    const client = await theClient.getClient(storageDir);
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
        menu: e.detail ?? undefined,
      })) ?? [];
    return cs;
  }

  params(): Record<string, unknown> {
    return { ...Source.defaultParams };
  }
}
