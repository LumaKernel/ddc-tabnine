import {
  BaseSource,
  Candidate,
  GatherCandidatesArguments,
} from "../ddc-tabnine/deps.ts";
import type {
  TabNineV2AutoCompleteRequest,
  TabNineV2AutoCompleteResponse,
} from "../ddc-tabnine/tabnine/client_v2.ts";
import { getAround } from "../ddc-tabnine/internal_autoload_fn.ts";

type Params = {
  maxSize: number;
};

export class Source extends BaseSource {
  async gatherCandidates(
    args: GatherCandidatesArguments,
  ): Promise<Candidate[]> {
    const p = args.sourceParams as Params;

    const [
      filename,
      before,
      after,
      regionIncludesBeginning,
      regionIncludesEnd,
    ] = await getAround(args.denops, p.maxSize);
    const req: TabNineV2AutoCompleteRequest = {
      maxNumResults: args.sourceOptions.maxCandidates,
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

  params(): Params {
    return {
      maxSize: 200,
    };
  }
}
