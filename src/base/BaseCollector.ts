import { Script } from "../types/config";
import { TransactionCollectorOptions } from "../types/indexer";
import { CellCollectorResults, CellProvider, QueryOptions, ScriptWrapper } from "../types/transaction";

/**
 * return if the input is a script wrapper
 * @param maybeWrapped
 */
export function isScriptWrapper(
  maybeWrapped: Script | ScriptWrapper | null
): maybeWrapped is ScriptWrapper {
  return (
    maybeWrapped !== null &&
    (maybeWrapped as ScriptWrapper).script !== undefined
  );
}

export interface CellCollector {
  collect(): CellCollectorResults;
}

export declare interface BaseCellCollector extends CellCollector {
  count(): Promise<number>;

  collect(): CellCollectorResults;
}

class TransactionCollector {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rpc: any;
  lock: ScriptWrapper | undefined;
  type: "empty" | ScriptWrapper | Script | undefined;
  indexer: CellProvider;
  skipMissing: boolean;
  includeStatus: boolean;
  fromBlock: string | undefined;
  toBlock: string | undefined;
  order: "asc" | "desc";
  skip: number | undefined;

  constructor(
    indexer: CellProvider,
    {
      lock,
      type,
      argsLen = -1,
      fromBlock,
      toBlock,
      order = "asc",
      skip,
    }: QueryOptions = {},
    {
      skipMissing = false,
      includeStatus = true,
    }: TransactionCollectorOptions = {}
  ) {
    if (!lock && (!type || type === "empty")) {
      throw new Error("Either lock or type script must be provided!");
    }
    // Wrap the plain `Script` into `ScriptWrapper`.
    if (lock && !isScriptWrapper(lock)) {
      this.lock = { script: lock, ioType: "both", argsLen: argsLen };
    } else if (lock && lock.script) {
      this.lock = lock;
      // check ioType, argsLen
      if (!lock.argsLen) {
        this.lock.argsLen = argsLen;
      }
      if (!lock.ioType) {
        this.lock.ioType = "both";
      }
    }
    if (type === "empty") {
      this.type = type;
    } else if (type && !isScriptWrapper(type)) {
      this.type = { script: type, ioType: "both", argsLen: argsLen };
    } else if (type && type.script) {
      this.type = type;
      // check ioType, argsLen
      if (!type.argsLen) {
        this.type.argsLen = argsLen;
      }
      if (!type.ioType) {
        this.type.ioType = "both";
      }
    }
    if (fromBlock) {
      assertHexadecimal("fromBlock", fromBlock);
    }
    if (toBlock) {
      assertHexadecimal("toBlock", toBlock);
    }
    if (order !== "asc" && order !== "desc") {
      throw new Error("Order must be either asc or desc!");
    }
    this.indexer = indexer;
    this.skipMissing = skipMissing;
    this.includeStatus = includeStatus;
    this.fromBlock = fromBlock;
    this.toBlock = toBlock;
    this.order = order;
    this.skip = skip;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.rpc = (indexer as any).rpc;
  }
}

export { TransactionCollector }