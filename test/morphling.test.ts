// import CKB from "../src/morphling"
import { capacity_createRawTransactionForJoyID } from '../src/Transaction/index'

/**
 * Dummy test
 */
describe('Dummy test', () => {
  it('works if true is truthy', () => {
    // CKB();
    capacity_createRawTransactionForJoyID(
      'ckt1qrfrwcdnvssswdwpn3s9v8fp87emat306ctjwsm3nmlkjg8qyza2cqgqqyse9w5xpgupt7q6sru8dcq9q8k4lktsegcsxjqm',
      'ckt1qrfrwcdnvssswdwpn3s9v8fp87emat306ctjwsm3nmlkjg8qyza2cqgqqyse9w5xpgupt7q6sru8dcq9q8k4lktsegcsxjqm',
      100,
      {
        RPCUrl: 'https://testnet.ckb.dev'
      }
    )
    expect(true).toBeTruthy()
  })
})
