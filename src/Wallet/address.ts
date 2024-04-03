import { DefaultConfig } from '../Config'
import { ADDRESS_FORMAT_FULL, BECH32_LIMIT } from '../types/bytes'
import { Config, Script, ScriptConfig } from '../types/config'
import { bech32, bech32m } from 'bech32'
import { hexify } from '../Utils/bytes'
import { HashType } from '../base'
import { CellDep } from '../types/transaction'

export const addressToLockScript = (address: string, config: Config | undefined): Script => {
  // config = config || DefaultConfig
  const env = address.slice(0, 3)
  config = config || (env === 'ckt' ? DefaultConfig.TestnetConig : DefaultConfig.MainnetConfig)
  try {
    const { words, prefix } = bech32m.decode(address)
    if (prefix !== config.PREFIX) {
      throw Error(`Invalid prefix! Expected: ${config.PREFIX}, actual: ${prefix}`)
    }
    const [formatType, ...body] = bech32m.fromWords(words)

    if (formatType !== ADDRESS_FORMAT_FULL) {
      throw new Error('Invalid address format type')
    }

    if (body.length < 32 + 1) {
      throw new Error('Invalid payload length, too short!')
    }

    const codeHash = hexify(body.slice(0, 32))
    const hashType = HashType.unpack(body.slice(32, 33))
    const args = hexify(body.slice(33))

    return { codeHash, hashType, args }
  } catch {
    throw Error(`Invalid address Type!`)
  }
}
