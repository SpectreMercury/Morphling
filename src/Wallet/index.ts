import { AddressPrefix, pubkeyToAddress } from '@nervosnetwork/ckb-sdk-utils';
import { ec as EC } from 'elliptic';
import { sha256 } from 'js-sha256';

const generateSecp2561PublicKey = () => {
    const ec = new EC('secp256k1');
    const keyPair = ec.genKeyPair();
    return keyPair.getPublic(true, 'hex');
}

const publicKeyToAddress = (prefix: 'ckb' | 'ckt') => {
    const publicKey = generateSecp2561PublicKey()
    return pubkeyToAddress(`0x${publicKey}`, {prefix: AddressPrefix.Testnet})
}

export default {
    generateSecp2561PublicKey,
    publicKeyToAddress
}