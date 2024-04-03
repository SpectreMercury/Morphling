import { BaseCellCollector } from "./BaseCollector";
import { Cell, DataWithSearchMode, GetBlockHashRPCResult, ScriptWrapper } from "../types/transaction";
import { Script, ScriptType } from "../types/config";
import { BI } from "./number";
import { CKBIndexerQueryOptions, GetCellsResults, LumosQueryOptions, Order, OtherQueryOptions, ScriptSearchMode, SearchFilter, SearchKey, SearchKeyFilter, TerminableCellFetcher } from "../types/query";
import { RpcScript, RpcSearchFilter, RpcSearchKey } from "../types/rpc";
import { RpcToSearchKey, toScript, toSearchKey } from "../Utils/rpc";
import { bytes, molecule } from "@ckb-lumos/codec";
import { blockchain } from "@ckb-lumos/base";
import { bytify } from "../Utils/bytes";


/**
 * @description `blockRange` is not supported, because pending cells don't have block number
 */
type LumosSearchFilter = Pick<
  SearchFilter,
  "script" | "scriptLenRange" | "outputCapacityRange" | "outputDataLenRange"
>;

type LumosSearchKey = Pick<
  SearchKey,
  "script" | "scriptType" | "scriptSearchMode"
> & { filter?: LumosSearchFilter };

const { table } = molecule



function instanceOfScriptWrapper(object: unknown): object is ScriptWrapper {
  return typeof object === "object" && object != null && "script" in object;
}

function instanceOfDataWithSearchMode(
  object: unknown
): object is DataWithSearchMode {
  return typeof object === "object" && object != null && "data" in object;
}

const unwrapDataWrapper = (input: DataWithSearchMode | string): string => {
  if (instanceOfDataWithSearchMode(input)) {
    return input.data;
  }
  return input;
};

const unwrapScriptWrapper = (inputScript: ScriptWrapper | Script): Script => {
  if (instanceOfScriptWrapper(inputScript)) {
    return inputScript.script;
  }
  return inputScript;
};

function assertHexString(debugPath: string, str: string): void {
  if (!/^0x([0-9a-fA-F][0-9a-fA-F])*$/.test(str)) {
    throw new Error(`${debugPath} must be a hex string!`);
  }
}

const getHexStringBytes = (hexString: string): number => {
  assertHexString("", hexString);
  return Math.ceil(hexString.substr(2).length / 2);
};

function convertQueryOptionToLumosSearchKey(
  queryOptions: LumosQueryOptions
): LumosSearchKey {
  let searchKeyLock: Script | undefined;
  let searchKeyType: Script | undefined;
  let searchKey: Required<SearchKey>;

  const queryLock = queryOptions.lock;
  const queryType = queryOptions.type;
  if (queryLock) {
    if (instanceOfScriptWrapper(queryLock)) {
      searchKeyLock = queryLock.script;
    } else {
      searchKeyLock = queryLock;
    }
  }
  if (queryType && queryType !== "empty") {
    if (instanceOfScriptWrapper(queryType)) {
      searchKeyType = queryType.script;
    } else {
      searchKeyType = queryType;
    }
  }

  if (searchKeyLock) {
    searchKey = {
      script: searchKeyLock,
      scriptType: "lock",
      scriptSearchMode: instanceOfScriptWrapper(queryLock)
        ? queryLock.searchMode || "prefix"
        : "prefix",
      filter: {},
    };
    searchKeyType && (searchKey.filter.script = searchKeyType);
  } else if (searchKeyType) {
    searchKey = {
      script: searchKeyType,
      scriptType: "type",
      scriptSearchMode: instanceOfScriptWrapper(queryType)
        ? queryType.searchMode || "prefix"
        : "prefix",
      filter: {},
    };
  } else {
    throw new Error("query.lock and query.type can't be both empty");
  }

  const { outputDataLenRange, outputCapacityRange, scriptLenRange } =
    queryOptions;

  searchKey.filter.outputDataLenRange = outputDataLenRange;
  searchKey.filter.outputCapacityRange = outputCapacityRange;
  searchKey.filter.scriptLenRange = scriptLenRange;

  if (queryType === "empty") {
    searchKey.filter.scriptLenRange = ["0x0", "0x1"];
  }

  return searchKey;
}

function BlockchainScript () {

}

function checkScriptWithPrefixMode(
  script: Script | undefined,
  filterScript: Script
): boolean {
  if (!script) {
    return false;
  }

  // codeHash should always be 32 bytes, so it only supports exact match mode
  if (!bytes.equal(filterScript.codeHash, script.codeHash)) {
    return false;
  }

  const expectArgsPrefix = bytes.bytify(filterScript.args);
  const actualArgsPrefix = bytes
    .bytify(script.args)
    .slice(0, expectArgsPrefix.length);
  if (!bytes.equal(expectArgsPrefix, actualArgsPrefix)) {
    return false;
  }

  if (script.hashType !== filterScript.hashType) {
    return false;
  }
  return true;
}

function checkScriptLenRange(
  script: Script | undefined,
  scriptLenRange: [string, string]
): boolean {
  const scriptLen = script
    ? BI.from(
        bytes.concat(script.codeHash, script.args).length +
          1 /* hashType length is 1 */
      )
    : BI.from(0);
  const fromScriptLen = BI.from(scriptLenRange[0]);
  const toScriptLen = BI.from(scriptLenRange[1]);
  if (scriptLen.lt(fromScriptLen) || scriptLen.gte(toScriptLen)) {
    return false;
  }
  return true;
}


export function filterByLumosSearchKey(
  cell: Cell,
  searchKey: LumosSearchKey
): boolean {
  const isExactMode = searchKey.scriptSearchMode === "exact";
  const { cellOutput } = cell;
  const { scriptType, script, filter } = searchKey;
  // Search mode
  if (isExactMode) {
    if (scriptType === "lock") {
      if (
        !bytes.equal(
          //@ts-ignore
          blockchain.Script.pack(cellOutput.lock),
          //@ts-ignore
          blockchain.Script.pack(script)
        )
      ) {
        return false;
      }
    } else {
      if (
        !cellOutput.type ||
        !bytes.equal(
          //@ts-ignore
          blockchain.Script.pack(cellOutput.type),
          //@ts-ignore
          blockchain.Script.pack(script)
        )
      ) {
        return false;
      }
    }
    // Prefix mode
  } else {
    if (scriptType === "lock") {
      if (!checkScriptWithPrefixMode(cellOutput.lock, script)) {
        return false;
      }
    } else {
      if (!checkScriptWithPrefixMode(cellOutput.type, script)) {
        return false;
      }
    }
  }

  // the "exact" mode works only on "SearchKey.script",
  // not on "SearchKey.filter.script"
  // the "SearchKey.filter.script" is always in prefix mode
  if (!filter) return true;
  // filter type script if scriptType is "lock"
  if (scriptType === "lock") {
    if (
      filter.script &&
      !checkScriptWithPrefixMode(cellOutput.type, filter.script)
    ) {
      return false;
    }

    if (
      filter.scriptLenRange &&
      !checkScriptLenRange(cellOutput.type, filter.scriptLenRange)
    ) {
      return false;
    }
    // filter lock script if scriptType is "type"
  } else {
    if (
      filter.script &&
      !checkScriptWithPrefixMode(cellOutput.lock, filter.script)
    ) {
      return false;
    }
    if (
      filter.scriptLenRange &&
      !checkScriptLenRange(cellOutput.lock, filter.scriptLenRange)
    ) {
      return false;
    }
  }

  const { outputCapacityRange, outputDataLenRange } = filter;

  if (outputCapacityRange) {
    const capacity = BI.from(cellOutput.capacity);
    const fromCapacity = BI.from(outputCapacityRange[0]);
    const toCapacity = BI.from(outputCapacityRange[1]);
    if (capacity.lt(fromCapacity) || capacity.gte(toCapacity)) {
      return false;
    }
  }

  if (outputDataLenRange) {
    const dataLen = BI.from(bytes.bytify(cell.data).length);
    const fromDataLen = BI.from(outputDataLenRange[0]);
    const toDataLen = BI.from(outputDataLenRange[1]);
    if (dataLen.lt(fromDataLen) || dataLen.gte(toDataLen)) {
      return false;
    }
  }

  return true;
}

function filterByLumosQueryOptions(
  cells: Cell[],
  options: LumosQueryOptions
): Cell[] {
  const searchKey = convertQueryOptionToLumosSearchKey(options);
  let filteredCells = cells.filter((cell) =>
    filterByLumosSearchKey(cell, searchKey)
  );

  if (options.argsLen && options.argsLen !== "any" && options.argsLen !== -1) {
    filteredCells = filteredCells.filter(
      (cell) =>
        bytes.bytify(cell.cellOutput.lock.args).length === options.argsLen
    );
  }

  if (!!options.data && options.data !== "any") {
    if (
      instanceOfDataWithSearchMode(options.data) &&
      options.data.searchMode === "exact"
    ) {
      const dataSearch = options.data as DataWithSearchMode;
      filteredCells = filteredCells.filter((cell) =>
        bytes.equal(bytes.bytify(cell.data), bytes.bytify(dataSearch.data))
      );
    } else if (
      instanceOfDataWithSearchMode(options.data) &&
      options.data.searchMode === "prefix"
    ) {
      const dataSearch = options.data as DataWithSearchMode;
      filteredCells = filteredCells.filter((cell) => {
        const expectPrefix = bytify(dataSearch.data);
        const actualPrefix = bytes
          .bytify(cell.data)
          .slice(0, expectPrefix.length);
        return bytes.equal(expectPrefix, actualPrefix);
      });
    } else {
      filteredCells = filteredCells.filter((cell) => {
        const expectPrefix = bytes.bytify(options.data as string);
        const actualPrefix = bytes
          .bytify(cell.data)
          .slice(0, expectPrefix.length);
        return bytes.equal(expectPrefix, actualPrefix);
      });
    }
  }

  return filteredCells;
}


const generateSearchKey = (queries: CKBIndexerQueryOptions): SearchKey => {
  let script: RpcScript | undefined = undefined;
  const filter: RpcSearchFilter = {};
  let script_type: ScriptType | undefined = undefined;
  let script_search_mode: ScriptSearchMode = "prefix";
  if (queries.lock) {
    const lock = unwrapScriptWrapper(queries.lock);
    script = toScript(lock);
    script_type = "lock";
    if (queries.type && typeof queries.type !== "string") {
      const type = unwrapScriptWrapper(queries.type);
      filter.script = toScript(type);
    }
  } else if (queries.type && typeof queries.type !== "string") {
    const type = unwrapScriptWrapper(queries.type);
    script = toScript(type);
    script_type = "type";
  }
  let block_range: [string, string] | null = null;
  if (queries.fromBlock && queries.toBlock) {
    //toBlock+1 cause toBlock need to be included
    block_range = [
      queries.fromBlock,
      `0x${BI.from(queries.toBlock).add(1).toString(16)}`,
    ];
  }
  if (block_range) {
    filter.block_range = block_range;
  }
  if (queries.outputDataLenRange) {
    filter.output_data_len_range = queries.outputDataLenRange;
  }
  if (queries.outputCapacityRange) {
    filter.output_capacity_range = queries.outputCapacityRange;
  }
  if (queries.scriptLenRange) {
    filter.script_len_range = queries.scriptLenRange;
  }
  if (queries.scriptSearchMode) {
    script_search_mode = queries.scriptSearchMode;
  }
  if (!script) {
    throw new Error("Either lock or type script must be provided!");
  }
  if (!script_type) {
    throw new Error("script_type must be provided");
  }
  return RpcToSearchKey({
    script,
    script_type,
    filter,
    script_search_mode,
  });
};



export class CKBCellCollector implements BaseCellCollector {
  public queries: CKBIndexerQueryOptions[];
  constructor(
    public terminableCellFetcher: TerminableCellFetcher,
    queries: CKBIndexerQueryOptions | CKBIndexerQueryOptions[],
    public otherQueryOptions?: OtherQueryOptions
  ) {
    const defaultQuery: CKBIndexerQueryOptions = {
      lock: undefined,
      type: undefined,
      argsLen: -1,
      data: "any",
      fromBlock: undefined,
      toBlock: undefined,
      order: "asc",
      skip: undefined,
      outputDataLenRange: undefined,
      outputCapacityRange: undefined,
      bufferSize: undefined,
    };
    this.queries = (Array.isArray(queries) ? queries : [queries]).map(
      (query) => ({ ...defaultQuery, ...query })
    );

    this.queries.forEach((query) => {
      this.validateQueryOption(query);
    });
    this.convertQueryOptionToSearchKey();
  }

  public validateQueryOption(queries: CKBIndexerQueryOptions): void {
    if (!queries.lock && (!queries.type || queries.type === "empty")) {
      throw new Error("Either lock or type script must be provided!");
    }

    if (queries.fromBlock) {
      assertHexadecimal("fromBlock", queries.fromBlock);
    }
    if (queries.toBlock) {
      assertHexadecimal("toBlock", queries.toBlock);
    }
    if (queries.order !== "asc" && queries.order !== "desc") {
      throw new Error("Order must be either asc or desc!");
    }
    if (queries.outputCapacityRange) {
      assertHexadecimal(
        "outputCapacityRange[0]",
        queries.outputCapacityRange[0]
      );
      assertHexadecimal(
        "outputCapacityRange[1]",
        queries.outputCapacityRange[1]
      );
    }

    if (queries.outputDataLenRange) {
      assertHexadecimal(
        "outputDataLenRange[0]",
        queries.outputDataLenRange[0]
      );
      assertHexadecimal(
        "outputDataLenRange[1]",
        queries.outputDataLenRange[1]
      );
    }
    if (queries.scriptLenRange) {
        assertHexadecimal("scriptLenRange[0]", queries.scriptLenRange[0]);
        assertHexadecimal("scriptLenRange[1]", queries.scriptLenRange[1]);
    }

    if (queries.outputDataLenRange && queries.data && queries.data !== "any") {
      const dataLen = getHexStringBytes(unwrapDataWrapper(queries.data));
      if (
        dataLen < Number(queries.outputDataLenRange[0]) ||
        dataLen >= Number(queries.outputDataLenRange[1])
      ) {
        throw new Error("data length not match outputDataLenRange");
      }
    }

    if (queries.skip && typeof queries.skip !== "number") {
      throw new Error("skip must be a number!");
    }

    if (queries.bufferSize && typeof queries.bufferSize !== "number") {
      throw new Error("bufferSize must be a number!");
    }
  }

  public convertQueryOptionToSearchKey(): void {
    this.queries.forEach((query) => {
      const queryLock = query.lock;
      // unWrap `ScriptWrapper` into `Script`.
      if (queryLock) {
        if (instanceOfScriptWrapper(queryLock)) {
          query.lock = queryLock.script;
        }
      }

      // unWrap `ScriptWrapper` into `Script`.
      if (query.type && query.type !== "empty") {
        if (
          typeof query.type === "object" &&
          instanceOfScriptWrapper(query.type)
        ) {
          query.type = query.type.script;
        }
      }

      if (!query.outputDataLenRange) {
        if (query.data && query.data !== "any") {
          const dataLenRange = getHexStringBytes(unwrapDataWrapper(query.data));
          query.outputDataLenRange = [
            "0x" + dataLenRange.toString(16),
            "0x" + (dataLenRange + 1).toString(16),
          ];
        }
      }

      if (!query.scriptLenRange && query.type === "empty") {
        query.scriptLenRange = ["0x0", "0x1"];
      }
    });
  }

  private async getLiveCell(
    query: CKBIndexerQueryOptions,
    lastCursor?: string
  ): Promise<GetCellsResults> {
    const searchKeyFilter: SearchKeyFilter = {
      sizeLimit: query.bufferSize,
      order: query.order as Order,
      lastCursor,
    };
    const result = await this.terminableCellFetcher.getCells(
      generateSearchKey(query),
      undefined,
      searchKeyFilter
    );
    return result;
  }

  async count(): Promise<number> {
    let counter = 0;

    for await (const _cell of this.collect()) {
      counter++;
    }
    return counter;
  }

  // eslint-disable-next-line
  private async request(rpcUrl: string, data: unknown): Promise<any> {
    const res: Response = await fetch(rpcUrl, {
      method: "POST",
      body: JSON.stringify(data),
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (res.status !== 200) {
      throw new Error(`indexer request failed with HTTP code ${res.status}`);
    }
    const result = await res.json();
    if (result.error !== undefined) {
      throw new Error(
        `indexer request rpc failed with error: ${JSON.stringify(result.error)}`
      );
    }
    return result;
  }

  private async getLiveCellWithBlockHash(
    query: CKBIndexerQueryOptions,
    lastCursor?: string
  ) {
    if (!this.otherQueryOptions) {
      throw new Error("CKB Rpc URL must provide");
    }
    const result: GetCellsResults = await this.getLiveCell(query, lastCursor);
    if (result.objects.length === 0) {
      return result;
    }
    const requestData = result.objects.map((cell, index) => {
      return {
        id: index,
        jsonrpc: "2.0",
        method: "get_block_hash",
        params: [cell.blockNumber],
      };
    });
    const blockHashList: GetBlockHashRPCResult[] = await this.request(
      this.otherQueryOptions.ckbRpcUrl,
      requestData
    );
    result.objects = result.objects.map((item, index) => {
      const rpcResponse = blockHashList.find(
        (responseItem: GetBlockHashRPCResult) => responseItem.id === index
      );
      const blockHash = rpcResponse && rpcResponse.result;
      return { ...item, blockHash };
    });
    return result;
  }

  /**
   * collect cells without blockHash by default.if you need blockHash, please add OtherQueryOptions.withBlockHash and OtherQueryOptions.ckbRpcUrl when constructor CellCollect.
   * don't use OtherQueryOption if you don't need blockHash,cause it will slowly your collect.
   */
  async *collect(): AsyncGenerator<Cell> {
    const visitedCellKey = new Set<string>();

    for (const query of this.queries) {
      for await (const cell of this.collectBySingleQuery(query)) {
        const key = `${cell.outPoint?.txHash}-${cell.outPoint?.index}`;
        if (visitedCellKey.has(key)) {
          continue;
        } else {
          visitedCellKey.add(key);
          yield cell;
        }
      }
    }
  }

  private async *collectBySingleQuery(
    query: CKBIndexerQueryOptions
  ): AsyncGenerator<Cell> {
    //TODO: fix return type
    const withBlockHash =
      this.otherQueryOptions &&
      "withBlockHash" in this.otherQueryOptions &&
      this.otherQueryOptions.withBlockHash;
    let lastCursor: undefined | string = undefined;
    const getCellWithCursor = async (): Promise<Cell[]> => {
      const result: GetCellsResults = await (withBlockHash
        ? this.getLiveCellWithBlockHash(query, lastCursor)
        : this.getLiveCell(query, lastCursor));
      lastCursor = result.lastCursor;
      return result.objects;
    };
    let cells: Cell[] = await getCellWithCursor();
    // filter cells by lumos query options
    cells = filterByLumosQueryOptions(cells, query);

    if (cells.length === 0) {
      return;
    }

    let buffer: Promise<Cell[]> = getCellWithCursor();
    let index = 0;
    let skippedCount = 0;
    while (true) {
      if (query.skip && skippedCount < query.skip) {
        skippedCount++;
      } else {
        yield cells[index];
      }
      index++;
      //reset index and exchange `cells` and `buffer` after yield last cell
      if (index === cells.length) {
        index = 0;
        cells = await buffer;
        // break if can not get more cells
        if (cells.length === 0) {
          break;
        }
        buffer = getCellWithCursor();
      }
    }
  }
}
