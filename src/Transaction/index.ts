import { Indexer } from "@ckb-lumos/ckb-indexer";
import { MainnetRPC, TestnetRPC } from "../Config";
import { Cell } from "../types/transaction";
import { addressToLockScript } from "../Wallet/address";
import { Script } from "../types/config";


export const collecteCell = (amount: string | number, address: string, RPCAddress?: string, config ? : Script): Cell[] => {
    const prefix = address.slice(0, 3);
    const RPCURL = RPCAddress ? RPCAddress : (prefix.toLocaleLowerCase() === 'ckt' ? TestnetRPC : MainnetRPC);
    const indexer = new Indexer(RPCURL);
    const collectCells: Cell[] = [];
    let collector = indexer.collector({
        //@ts-ignore
        lock: addressToLockScript(address, config),
    })
    return []
}