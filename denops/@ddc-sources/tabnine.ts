import {
  BaseSource,
  Candidate,
  GatherCandidatesArguments,
  OnCompleteDoneArguments,
} from "../ddc-tabnine/deps.ts";
import type {
  TabNineV2AutoCompleteRequest,
  TabNineV2AutoCompleteResponse,
} from "../ddc-tabnine/tabnine/client_v2.ts";
import * as internal from "../ddc-tabnine/internal_autoload_fn.ts";

type Params = {
  maxSize: number;
  maxNumResults: number;
};

type UserData = {
  /** Delete suffix */
  s: string;
  /** Add as prefix */
  P: string;
  /** Add as suffix */
  S: string;
};

export class Source extends BaseSource<Params, UserData> {
  async gatherCandidates(
    args: GatherCandidatesArguments<Params>,
  ): Promise<Candidate<UserData>[]> {
    const p = args.sourceParams as Params;

    const [
      filename,
      before,
      after,
      regionIncludesBeginning,
      regionIncludesEnd,
    ] = await internal.getAround(args.denops, p.maxSize);
    const req: TabNineV2AutoCompleteRequest = {
      maxNumResults: p.maxNumResults,
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
    const cs: Candidate<UserData>[] =
      (res?.results?.filter((e) => e?.new_prefix).map((e) => {
        const newLine = e.new_prefix.indexOf("\n");
        return {
          word: newLine === -1 ? e.new_prefix : e.new_prefix.slice(0, newLine),
          abbr: e.new_prefix + (e.new_suffix ?? ""),
          menu: e.detail ?? undefined,
          user_data: {
            s: e.old_suffix,
            P: (newLine === -1 ? "" : e.new_prefix.slice(newLine)),
            S: e.new_suffix,
          },
        };
      }) ?? []);
    return cs;
  }

  params(): Params {
    return {
      maxSize: 200,
      maxNumResults: 5,
    };
  }

  async onCompleteDone(
    args: OnCompleteDoneArguments<Params, UserData>,
  ): Promise<void> {
    const { s: oldSuffix, P: newPrefixMore, S: newSuffix } = args
      .userData;
    await internal.onCompleteDone(
      args.denops,
      oldSuffix,
      newPrefixMore,
      newSuffix,
    );
  }
}
