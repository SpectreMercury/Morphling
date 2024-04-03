import { List, Map as ImmutableMap } from 'immutable'
import { Script } from './config'
import { ScriptSearchMode, ScriptType } from '@ckb-lumos/ckb-indexer/lib/type'

export type SearchMode = 'exact' | 'prefix'

export type DepType = 'depGroup' | 'code'

export type HexNumber = string
export type HexString = string
export type Hash = string
export type HashType = string

export interface CellDep {
  outPoint: OutPoint
  depType: DepType
}

export interface OutPoint {
  txHash: Hash
  index: HexNumber
}

export interface Cell {
  cellOutput: {
    capacity: HexNumber
    lock: Script
    type?: Script
  }
  data: HexString
  outPoint?: OutPoint
  blockHash?: Hash
  blockNumber?: HexNumber
  txIndex?: HexNumber
}

export interface CellCollectorResults {
  [Symbol.asyncIterator](): AsyncIterator<Cell>
}

export interface CellCollector {
  collect(): CellCollectorResults
}

export type DataWithSearchMode = {
  searchMode: SearchMode
  data: string
}

export interface ScriptWrapper {
  script: Script
  searchMode?: SearchMode
  ioType?: 'input' | 'output' | 'both'
  argsLen?: number | 'any'
}

export interface QueryOptions {
  lock?: Script | ScriptWrapper
  type?: Script | ScriptWrapper | 'empty'
  // data = any means any data content is ok
  data?: string | 'any' | DataWithSearchMode

  /** `lock` script args length */
  argsLen?: number | 'any'
  /** `fromBlock` itself is included in range query. */
  fromBlock?: string
  /** `toBlock` itself is included in range query. */
  toBlock?: string
  skip?: number
  order?: 'asc' | 'desc'
}

export interface CellProvider {
  uri?: string
  collector(queryOptions: QueryOptions): CellCollector
}

export interface TransactionSkeletonInterface {
  cellProvider: CellProvider | null
  cellDeps: List<CellDep>
  headerDeps: List<string>
  inputs: List<Cell>
  outputs: List<Cell>
  witnesses: List<string>
  fixedEntries: List<{ field: string; index: number }>
  signingEntries: List<{ type: string; index: number; message: string }>
  inputSinces: ImmutableMap<number, string>
}

export interface WitnessArgsInterface {
  lock: string
  inputType: string
  outputType: string
}

export interface GetBlockHashRPCResult {
  jsonrpc: string
  id: number
  result: string
}

export interface RawTransaction {
  version: string
  cellDeps: CellDep[]
  headerDeps: string[]
  inputs: {
    previousOutput: OutPoint | null
    since: string
  }[]
  outputs: {
    capacity: HexNumber
    lock: Script
    type?: Script
  }[]
  witnesses: string[]
  outputsData: string[]
}
