import { Script } from "../types/config";
import { SearchFilter, SearchKey } from "../types/query";
import { RpcScript, RpcSearchFilter, RpcSearchKey } from "../types/rpc";

export const toScript = (data: Script): RpcScript => ({
  code_hash: data.codeHash,
  hash_type: data.hashType,
  args: data.args,
});

const RpcToScript = (data: RpcScript): Script => ({
  codeHash: data.code_hash,
  hashType: data.hash_type,
  args: data.args,
});

export const toSearchFilter = (data: SearchFilter): RpcSearchFilter => {
  return {
    script: data.script ? toScript(data.script) : data.script,
    output_data_len_range: data.outputDataLenRange,
    output_capacity_range: data.outputCapacityRange,
    block_range: data.blockRange,
    script_len_range: data.scriptLenRange,
  };
};

const RpctoSearchFilter = (data: RpcSearchFilter): SearchFilter => {
  return {
    script: data.script ? RpcToScript(data.script) : data.script,
    outputDataLenRange: data.output_data_len_range,
    outputCapacityRange: data.output_capacity_range,
    scriptLenRange: data.script_len_range,
    blockRange: data.block_range,
  };
};


export const RpcToSearchKey = (data: RpcSearchKey): SearchKey => ({
  script: RpcToScript(data.script),
  scriptType: data.script_type,
  filter: data.filter ? RpctoSearchFilter(data.filter) : data.filter,
  scriptSearchMode: data.script_search_mode,
});

export const toSearchKey = (data: SearchKey): RpcSearchKey => ({
  script: toScript(data.script),
  script_type: data.scriptType,
  filter: data.filter ? toSearchFilter(data.filter) : data.filter,
  script_search_mode: data.scriptSearchMode ? data.scriptSearchMode : "prefix",
});