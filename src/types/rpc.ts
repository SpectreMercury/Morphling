import { Script, ScriptType } from "./config";
import { ScriptSearchMode } from "./query";

export type RpcScript = {
  code_hash: string;
  hash_type: string;
  args: string;
};

export interface RpcSearchFilter {
  script?: RpcScript;
  output_data_len_range?: [string, string]; //empty
  output_capacity_range?: [string, string]; //empty
  block_range?:  [string, string]; //fromBlock-toBlock
  script_len_range?:  [string, string];
}

export interface RpcSearchKey {
  script: RpcScript;
  script_type: ScriptType;
  filter?: RpcSearchFilter;
  script_search_mode?: ScriptSearchMode;
}