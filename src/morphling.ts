// import { AddressPrefix, pubkeyToAddress } from '@nervosnetwork/ckb-sdk-utils';
// import { ec as EC } from 'elliptic';
// import { sha256 } from 'js-sha256';


// const CKB = () => {
//   const ec = new EC('secp256k1');
//   const keyPair = ec.genKeyPair();
//   const publicKey = keyPair.getPublic(true, 'hex');
//   const publicKeyHash = sha256(Buffer.from(publicKey, 'hex'));
//   const address = pubkeyToAddress(`0x${publicKey}`, {prefix: AddressPrefix.Testnet})
//   console.log(`私钥: ${keyPair.getPrivate('hex')}`);
//   console.log(`公钥: ${publicKey}`);
//   console.log(address);
// }

// export default CKB

export * from './Config';