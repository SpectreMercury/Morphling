import { Script } from '../types/config'
import { TransactionSkeletonInterface, WitnessArgsInterface } from '../types/transaction'
import { blockchain } from '@ckb-lumos/base/lib/index'
import { bytes } from '@ckb-lumos/codec'

export const assembleWitnesses_secp256k1 = (tx: TransactionSkeletonInterface, fromLock: Script) => {
  const firstIdx = tx.inputs.findIndex(input => {
    return (
      input.cellOutput.lock.codeHash == fromLock.codeHash &&
      input.cellOutput.lock.hashType == fromLock.hashType &&
      input.cellOutput.lock.args == fromLock.args
    )
  })

  if (firstIdx !== -1) {
    while (firstIdx >= tx.witnesses.size) {
      tx.witnesses.push('0x')
    }
    let witness: string = tx.witnesses.get(firstIdx)!
    const newWitnessArgs: WitnessArgsInterface = {
      /* 65-byte zeros in hex */
      lock:
        '0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
      inputType: '',
      outputType: ''
    }
    let doReplace = true
    if (witness !== '0x') {
      const witnessArgs = blockchain.WitnessArgs.unpack(bytes.bytify(witness))
      const lock = witnessArgs.lock
      if (!!lock && !!newWitnessArgs.lock && !bytes.equal(lock, newWitnessArgs.lock)) {
        // throw new Error('Lock field in first witness is set aside for signature!')
        doReplace = false
      }
      const inputType = witnessArgs.inputType
      if (!!inputType) {
        newWitnessArgs.inputType = inputType
      }
      const outputType = witnessArgs.outputType
      if (!!outputType) {
        newWitnessArgs.outputType = outputType
      }
    }
    if (doReplace) {
      witness = bytes.hexify(blockchain.WitnessArgs.pack(newWitnessArgs))
      tx.witnesses.set(firstIdx, witness)
    }
    // txSkeleton = txSkeleton.update('witnesses', witnesses => witnesses.set(firstIndex, witness))

    return { tx, witnessIdx: firstIdx }
  }
}
