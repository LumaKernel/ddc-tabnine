import { TabNine } from "./client_base.ts";

export interface TabNineV2AutoCompleteRequest {
  filename: string;
  before: string;
  after: string;
  regionIncludesBeginning: boolean;
  regionIncludesEnd: boolean;
  maxNumResults: number;
}

export interface TabNineV2AutoCompleteResponseResult {
  /**
   * @example ");"
   */
  new_prefix: string;
  /**
   * @example ")"
   */
  old_suffix: string;
  new_suffix: string;
  /**
   * @example "32%"
   */
  detail: string;
}

export interface TabNineV2AutoCompleteResponse {
  old_prefix: string;
  results: TabNineV2AutoCompleteResponseResult[];
  user_message: unknown[];
  docs: unknown[];
}

export class TabNineV2 extends TabNine {
  static readonly apiVersion = "2.0.0";
  constructor(
    clientName: string,
    storagePath: string,
  ) {
    super(clientName, storagePath);
  }
  async requestAutocomplete(
    request: TabNineV2AutoCompleteRequest,
  ): Promise<TabNineV2AutoCompleteResponse> {
    // deno-lint-ignore no-explicit-any
    const response: any = await super.request({
      version: TabNineV2.apiVersion,
      request: {
        Autocomplete: {
          filename: request.filename,
          before: request.before,
          after: request.after,
          region_includes_beginning: request.regionIncludesBeginning,
          region_includes_end: request.regionIncludesEnd,
          max_num_results: request.maxNumResults,
        },
      },
    });
    return response;
  }
  async requestConfigDir(): Promise<string | null> {
    // deno-lint-ignore no-explicit-any
    const response: any = await super.request({
      version: TabNineV2.apiVersion,
      request: {
        Autocomplete: {
          filename: "1",
          before: "TabNine::config_dir",
          after: "\n",
          region_includes_beginning: true,
          region_includes_end: true,
          max_num_results: 5,
        },
      },
    });
    const configDir = response?.results?.[0]?.new_prefix;
    if (typeof configDir === "string") return configDir;
    return null;
  }
}
