import {
  BaseSource,
  Candidate,
  GatherCandidatesArguments,
} from "../ddc-tabnine/deps.ts";
import { defaultStorageDir } from "../ddc-tabnine/storage_dir.ts";
import type {
  TabNineV2AutoCompleteRequest,
  TabNineV2AutoCompleteResponse,
} from "../ddc-tabnine/tabnine/client_v2.ts";
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
      filename,
      before,
      after,
      regionIncludesBeginning,
      regionIncludesEnd,
    ] = await getAround(args.denops, p.maxSize || Source.defaultParams.maxSize);
    const req: TabNineV2AutoCompleteRequest = {
      maxNumResults: p.maxNumResults || Source.defaultParams.maxNumResults,
      filename,
      before,
      after,
      regionIncludesBeginning,
      regionIncludesEnd,
    };
    const resUnknown: unknown = await args.denops.dispatch(
      "ddc-tabnine",
      "internalRequestAutocomplete",
      req,
    );
    // deno-lint-ignore no-explicit-any
    const res: TabNineV2AutoCompleteResponse = resUnknown as any;
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
