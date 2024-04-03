import { MainnetRPC, TestnetRPC } from "../Config";
import { Cell } from "../types/transaction";

export const collecteCell = (amount: string | number, address: string, RPCAddress?: string): Cell[] => {
    const prefix = address.slice(0, 3);
    const RPCURL = RPCAddress ? RPCAddress : (prefix.toLocaleLowerCase() === 'ckt' ? TestnetRPC : MainnetRPC);
    
    return []
}