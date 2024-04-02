import { List, Map as ImmutableMap } from "immutable";
import { Script } from "./config";

export type SearchMode = "exact" | "prefix";

export type DepType = "depGroup" | "code";
export interface CellDep {
  outPoint: OutPoint;
  depType: DepType;
}

export interface OutPoint {
  txHash: string;
  index: string;
}

export interface Cell {
  cellOutput: {
    capacity: string;
    lock: Script;
    type?: Script;
  };
  data: string;
  outPoint?: OutPoint;
  blockHash?: string;
  blockNumber?: string;
  txIndex?: string;
}

export interface CellCollectorResults {
  [Symbol.asyncIterator](): AsyncIterator<Cell>;
}

export interface CellCollector {
  collect(): CellCollectorResults;
}

export type DataWithSearchMode = {
  searchMode: SearchMode;
  data: string;
};

export interface ScriptWrapper {
  script: Script;
  searchMode?: SearchMode;
  ioType?: "input" | "output" | "both";
  argsLen?: number | "any";
}


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

export interface CellProvider {
  uri?: string;
  collector(queryOptions: QueryOptions): CellCollector;
}

export interface TransactionSkeletonInterface {
  cellProvider: CellProvider | null;
  cellDeps: List<CellDep>;
  headerDeps: List<string>;
  inputs: List<Cell>;
  outputs: List<Cell>;
  witnesses: List<string>;
  fixedEntries: List<{ field: string; index: number }>;
  signingEntries: List<{ type: string; index: number; message: string }>;
  inputSinces: ImmutableMap<number, string>;
}
