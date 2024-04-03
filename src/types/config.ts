import { Hash, HashType, HexString } from "./transaction";

export interface ScriptConfig {
  CODE_HASH: string;
  HASH_TYPE: "type" | "data"; 
  TX_HASH: string;
  INDEX: string;
  DEP_TYPE: "depGroup" | "code"; 
  SHORT_ID?: number;
}

export interface Config {
  PREFIX: string;
  SCRIPTS: {
    SECP256K1_BLAKE160: ScriptConfig;
    SECP256K1_BLAKE160_MULTISIG: ScriptConfig;
    DAO: ScriptConfig;
    SUDT: ScriptConfig;
    ANYONE_CAN_PAY: ScriptConfig;
    OMNILOCK: ScriptConfig;
  };
}

export interface Script {
  codeHash: Hash;
  hashType: HashType;
  args: HexString;
}

export type ScriptType = "type" | "lock";
