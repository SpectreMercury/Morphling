import { BytesCodec, FixedBytesCodec, Uint8ArrayCodec } from "../types/blockchain";
import { TypeHash } from "../types/bytes";
import { bytify } from "../Utils/bytes";
import JSBI from "jsbi";
import { BI, BIish } from "./number";

export const Uint8 = createUintNumberCodec(1);

const createUintBICodec = (byteLength: number, littleEndian = false) => {
  const max = BI.from(1)
    .shl(byteLength * 8)
    .sub(1);

  return createFixedBytesCodec<BI, BIish>({
    byteLength,
    pack(biIsh) {
      let endianType: "LE" | "BE" | "" = littleEndian ? "LE" : "BE";

      if (byteLength <= 1) {
        endianType = "";
      }
      const typeName = `Uint${byteLength * 8}${endianType}`;
      if (typeof biIsh === "number" && !Number.isSafeInteger(biIsh)) {
        throw  (
          `${biIsh} is not a safe integer ${typeName}`
        );
      }

      let num = BI.from(biIsh);
      assertNumberRange(num, 0, max, typeName);

      const result = new DataView(new ArrayBuffer(byteLength));

      for (let i = 0; i < byteLength; i++) {
        if (littleEndian) {
          result.setUint8(i, num.and(0xff).toNumber());
        } else {
          result.setUint8(byteLength - i - 1, num.and(0xff).toNumber());
        }
        num = num.shr(8);
      }

      return new Uint8Array(result.buffer);
    },
    unpack: (buf) => {
      const view = new DataView(Uint8Array.from(buf).buffer);
      let result = BI.from(0);

      for (let i = 0; i < byteLength; i++) {
        if (littleEndian) {
          result = result.or(BI.from(view.getUint8(i)).shl(i * 8));
        } else {
          result = result.shl(8).or(view.getUint8(i));
        }
      }

      return result;
    },
  });
};

function createUintNumberCodec(
  byteLength: number,
  littleEndian = false
): FixedBytesCodec<number, BIish> {
  const codec = createUintBICodec(byteLength, littleEndian);
  return {
    __isFixedCodec__: true,
    byteLength,
    pack: (packable) => codec.pack(packable),
    unpack: (unpackable) => codec.unpack(unpackable).toNumber(),
  };
}

export function createBytesCodec<Unpacked, Packable = Unpacked>(
  codec: Uint8ArrayCodec<Unpacked, Packable>
): BytesCodec<Unpacked, Packable> {
  return {
    pack: (unpacked) => codec.pack(unpacked),
    unpack: (bytesLike) => codec.unpack(bytify(bytesLike)),
  };
}

export function assertBufferLength(
  buf: { byteLength: number },
  length: number
): void {
  if (buf.byteLength !== length) {
    throw new Error(
      `Invalid buffer length: ${buf.byteLength}, should be ${length}`
    );
  }
}

export function createFixedBytesCodec<Unpacked, Packable = Unpacked>(
  codec: Uint8ArrayCodec<Unpacked, Packable> & { byteLength: number }
): FixedBytesCodec<Unpacked, Packable> {
  const byteLength = codec.byteLength;
  return {
    __isFixedCodec__: true,
    byteLength,
    ...createBytesCodec({
      pack: (u) => {
        const packed = codec.pack(u);
        assertBufferLength(packed, byteLength);
        return packed;
      },
      unpack: (buf) => {
        assertBufferLength(buf, byteLength);
        return codec.unpack(buf);
      },
    }),
  };
}


/**
 * <pre>
 *  0b0000000 0
 *    ───┬─── │
 *       │    ▼
 *       │   type - use the default vm version
 *       │
 *       ▼
 * data* - use a particular vm version
 * </pre>
 *
 * Implementation of blockchain.mol
 * https://github.com/nervosnetwork/ckb/blob/5a7efe7a0b720de79ff3761dc6e8424b8d5b22ea/util/types/schemas/blockchain.mol
 */
export const HashType = createFixedBytesCodec<TypeHash>({
  byteLength: 1,
  pack: (type) => {
    // prettier-ignore
    if (type === "type")  return Uint8.pack(0b0000000_1);
    // prettier-ignore
    if (type === "data")  return Uint8.pack(0b0000000_0);
    if (type === "data1") return Uint8.pack(0b0000001_0);
    if (type === "data2") return Uint8.pack(0b0000010_0);
    throw new Error(`Invalid hash type: ${type}`);
  },
  unpack: (buf) => {
    const hashTypeBuf = Uint8.unpack(buf);
    if (hashTypeBuf === 0b0000000_1) return "type";
    if (hashTypeBuf === 0b0000000_0) return "data";
    if (hashTypeBuf === 0b0000001_0) return "data1";
    if (hashTypeBuf === 0b0000010_0) return "data2";
    throw new Error(`Invalid hash type: ${hashTypeBuf}`);
  },
});

function assertNumberRange(
  value: BIish,
  min: BIish,
  max: BIish,
  typeName: string
): void {
  value = BI.from(value);

  if (value.lt(min) || value.gt(max)) {
    throw (
      `Value must be between ${min.toString()} and ${max.toString()}, but got ${value.toString()},
      typeName`
    );
  }
}
