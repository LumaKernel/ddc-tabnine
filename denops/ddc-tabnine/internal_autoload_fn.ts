import { Denops, fn } from "./deps.ts";
export type { Denops };
export { fn };

// deno-lint-ignore no-explicit-any
const createCaller = (name: string): any => {
  return async (denops: Denops, ...args: unknown[]) => {
    return await fn.call(denops, name, args);
  };
};

export type GetAround = (
  denops: Denops,
  limit: number,
) => Promise<[
  string,
  string,
  string,
  boolean,
  boolean,
  number,
]>;
export const getAround = createCaller(
  "ddc_tabnine#internal#get_around",
) as GetAround;
