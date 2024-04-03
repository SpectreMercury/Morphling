import { Script, ScriptType } from "./config";
import { Cell, DataWithSearchMode, ScriptWrapper } from "./transaction";

export type ScriptSearchMode = "prefix" | "exact";
export type Order = "asc" | "desc";

export interface SearchFilter {
  script?: Script;
  scriptLenRange?: [string, string];
  outputDataLenRange?: [string, string]; //empty
  outputCapacityRange?: [string, string]; //empty
  blockRange?: [string, string]; //fromBlock-toBlock
}

export type LumosQueryOptions = Pick<
  CKBIndexerQueryOptions,
  | "lock"
  | "type"
  | "data"
  | "argsLen"
  | "outputDataLenRange"
  | "outputCapacityRange"
  | "scriptLenRange"
>;

export interface QueryOptions {
  lock?: Script | ScriptWrapper;
  type?: Script | ScriptWrapper | "empty";
  // data = any means any data content is ok
  data?: string | "any" | DataWithSearchMode;

  /** `lock` script args length */
  argsLen?: number | "any";
  /** `fromBlock` itself is included in range query. */
  fromBlock?: string;
  /** `toBlock` itself is included in range query. */
  toBlock?: string;
  skip?: number;
  order?: "asc" | "desc";
}

export interface CKBIndexerQueryOptions extends QueryOptions {
  outputDataLenRange?: [string, string];
  outputCapacityRange?: [string, string];
  scriptLenRange?: [string, string];
  bufferSize?: number;
  withData?: boolean;
  groupByTransaction?: boolean;
  scriptSearchMode?: ScriptSearchMode;
}

export interface TerminableCellFetcher {
  getCells: GetCellWithTerminator;
}

export interface SearchKey {
  script: Script;
  scriptType: ScriptType;
  scriptSearchMode?: ScriptSearchMode;
  filter?: SearchFilter;
}

export declare type Terminator = (
  index: number,
  cell: Cell
) => TerminatorResult;

export interface TerminatorResult {
  stop: boolean;
  push: boolean;
}

export interface SearchKeyFilter {
  sizeLimit?: number;
  order?: Order;
  lastCursor?: string | undefined;
}

export interface GetCellsResults {
  lastCursor: string;
  objects: Cell[];
}



export declare type GetCellWithTerminator = (
  searchKey: SearchKey,
  terminator?: Terminator,
  searchKeyFilter?: SearchKeyFilter
) => Promise<GetCellsResults>;

export interface OtherQueryOptions {
  withBlockHash: true;
  ckbRpcUrl: string;
}