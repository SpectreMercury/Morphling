import { Indexer } from '@ckb-lumos/ckb-indexer'
import { DefaultConfig, MAX_FEE, MainnetRPC, TestnetRPC } from '../Config'
import { Cell, CellDep, RawTransaction, TransactionSkeletonInterface } from '../types/transaction'
import { addressToLockScript } from '../Wallet/address'
import { Config, Script } from '../types/config'
import { BI, parseUnit } from '../base/number'
import { List, Map as ImmutableMap } from 'immutable'
import { assembleWitnesses_joyID } from '../base/witness'

export const collecteCell = async (
  address: string,
  RPCUrl: string,
  config?: Config,
  typeScript?: Script
) => {
  const prefix = address.slice(0, 3)
  const RPCURL = RPCUrl ? RPCUrl : prefix.toLocaleLowerCase() === 'ckt' ? TestnetRPC : MainnetRPC
  const indexer = new Indexer(RPCURL)
  const collectCells: Cell[] = []
  let collector = indexer.collector({
    //@ts-ignore
    lock: addressToLockScript(address, config),
    //@ts-ignore
    type: typeScript ? typeScript : 'empty'
  })

  for await (const cell of collector.collect()) {
    collectCells.push(cell)
  }

  return collectCells
}

export const getCellsDepByScript = (
  script: Script,
  options: {
    isMainnet: boolean
    config: Config | undefined
  }
) => {
  const config =
    options.config ||
    (!options.isMainnet ? DefaultConfig.TestnetConig : DefaultConfig.MainnetConfig)

  for (const key in config.SCRIPTS) {
    if (Object.prototype.hasOwnProperty.call(config.SCRIPTS, key)) {
      //@ts-ignore
      const scriptConfig: ScriptConfig = config.SCRIPTS[key]
      if (script.codeHash == scriptConfig.CODE_HASH && script.hashType == scriptConfig.HASH_TYPE) {
        const cellDep: CellDep = {
          outPoint: {
            txHash: scriptConfig.TX_HASH,
            index: scriptConfig.INDEX
          },
          depType: scriptConfig.DEP_TYPE
        }
        return cellDep
      }
    }
  }
}

export const capacity_buildTxSkeletonWithOutWitness = async (
  fromAddress: string,
  toAddress: string,
  amount: string | number,
  options: {
    RPCUrl: string
    config?: Config
    fee?: string | number
  }
) => {
  const env = fromAddress.slice(0, 3)
  const isMainnet = env === 'ckt' ? false : true

  const cells = await collecteCell(fromAddress, options.RPCUrl, options.config)

  const inputs: List<Cell> = List<Cell>()
  const outputs: List<Cell> = List<Cell>()
  const inputSinces: ImmutableMap<number, string> = ImmutableMap<number, string>()

  let payAmount = BI.from(0)
  const fee = options.fee ? BI.from(parseUnit(options.fee.toString(), 'ckb')) : MAX_FEE
  const sendAmount = BI.from(amount)

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i]

    inputs.push(cell)
    payAmount = payAmount.add(cell.cellOutput.capacity)
    inputSinces.set(i, '0x0')

    if (payAmount.gte(sendAmount.add(fee))) {
      break
    }
  }

  if (payAmount.lt(sendAmount.add(fee))) {
    return
  }

  outputs.push({
    data: '0x',
    cellOutput: {
      lock: addressToLockScript(toAddress, options.config),
      capacity: sendAmount.toHexString()
    }
  })

  const changeAmount = payAmount.sub(sendAmount).sub(fee)
  if (changeAmount.gt(0)) {
    outputs.push({
      data: '0x',
      cellOutput: {
        lock: addressToLockScript(fromAddress, options.config),
        capacity: changeAmount.toHexString()
      }
    })
  }

  const cellDeps = List<CellDep>()
  const fromScript = addressToLockScript(fromAddress, options.config)
  const toScript = addressToLockScript(toAddress, options.config)

  const fromCellDep = getCellsDepByScript(fromScript, { isMainnet, config: options.config })
  if (fromCellDep) {
    const findItem = cellDeps.find(
      v =>
        v.depType == fromCellDep.depType &&
        v.outPoint.txHash == fromCellDep.outPoint.txHash &&
        v.outPoint.index == fromCellDep.outPoint.index
    )

    if (!findItem) {
      cellDeps.push(fromCellDep)
    }
  }

  const toCellDep = getCellsDepByScript(toScript, { isMainnet, config: options.config })
  if (toCellDep) {
    const findItem = cellDeps.find(
      v =>
        v.depType == toCellDep.depType &&
        v.outPoint.txHash == toCellDep.outPoint.txHash &&
        v.outPoint.index == toCellDep.outPoint.index
    )

    if (!findItem) {
      cellDeps.push(toCellDep)
    }
  }

  const txSkeleton: TransactionSkeletonInterface = {
    cellProvider: null,
    inputs,
    outputs,
    inputSinces,
    cellDeps,
    witnesses: List<string>(),
    headerDeps: List<string>(),
    fixedEntries: List<{ field: string; index: number }>(),
    signingEntries: List<{ type: string; index: number; message: string }>()
  }

  return txSkeleton
}

export const createRawTransaction = (txSkeleton: TransactionSkeletonInterface) => {
  const rawTx: RawTransaction = {
    version: '0x0',
    cellDeps: [],
    headerDeps: [],
    inputs: [],
    outputs: [],
    outputsData: [],
    witnesses: []
  }

  // cellDeps
  for (let i = 0; i < txSkeleton.cellDeps.size; i++) {
    const cellDep = txSkeleton.cellDeps.get(i)
    if (cellDep) rawTx.cellDeps.push(cellDep)
  }
  // headerDeps
  for (let i = 0; i < txSkeleton.headerDeps.size; i++) {
    const header = txSkeleton.headerDeps.get(i)
    if (header) rawTx.headerDeps.push(header)
  }
  // inputs
  for (let i = 0; i < txSkeleton.inputs.size; i++) {
    const input = txSkeleton.inputs.get(i)
    const inputSince = txSkeleton.inputSinces.get(i)
    if (input && input.outPoint && inputSince) {
      rawTx.inputs.push({
        previousOutput: {
          txHash: input.outPoint.txHash,
          index: input.outPoint.index
        },
        since: inputSince
      })
    }
  }
  // outputs and outputsData
  for (let i = 0; i < txSkeleton.outputs.size; i++) {
    const output = txSkeleton.outputs.get(i)
    if (output) {
      rawTx.outputs.push(output.cellOutput)
      rawTx.outputsData.push(output.data)
    }
  }
  // witness
  for (let i = 0; i < txSkeleton.witnesses.size; i++) {
    const witnessItem = txSkeleton.witnesses.get(i)
    if (witnessItem) {
      rawTx.witnesses.push(witnessItem)
    }
  }

  return rawTx
}

/*
import { signRawTransaction } from "@joyid/ckb";

const signedTx = await signRawTransaction(rawTx, seller, { witnessIndex });

rpc.sendTransaction(signedTx, 'passthrough');
*/
export const capacity_createRawTransactionForJoyID = async (
  fromAddress: string,
  toAddress: string,
  amount: string | number,
  options: {
    RPCUrl: string
    config?: Config
    fee?: string | number
  }
) => {
  const txSkeleton = await capacity_buildTxSkeletonWithOutWitness(
    fromAddress,
    toAddress,
    amount,
    options
  )

  if (txSkeleton) {
    const result = assembleWitnesses_joyID(
      txSkeleton,
      addressToLockScript(fromAddress, options.config)
    )

    if (result) {
      const witnessIdx = result.witnessIdx
      const rawTx = createRawTransaction(txSkeleton)

      return { rawTx, witnessIdx }
    }
  }
}
