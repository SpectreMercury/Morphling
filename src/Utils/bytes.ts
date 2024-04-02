import { BytesLike } from "../types/bytes";
import { assertHexString, CHAR_0, CHAR_9, CHAR_a, CHAR_A, CHAR_F } from "./common";

function bytifyHex(hex: string): Uint8Array {
  assertHexString(hex);

  const u8a = Uint8Array.from({ length: hex.length / 2 - 1 });

  for (let i = 2, j = 0; i < hex.length; i = i + 2, j++) {
    const c1 = hex.charCodeAt(i);
    const c2 = hex.charCodeAt(i + 1);

    // prettier-ignore
    const n1 = c1 <= CHAR_9 ? c1 - CHAR_0 : c1 <= CHAR_F ? c1 - CHAR_A + 10 : c1 - CHAR_a + 10
    // prettier-ignore
    const n2 = c2 <= CHAR_9 ? c2 - CHAR_0 : c2 <= CHAR_F ? c2 - CHAR_A + 10 : c2 - CHAR_a + 10

    u8a[j] = (n1 << 4) | n2;
  }

  return u8a;
}

function bytifyArrayLike(xs: ArrayLike<number>): Uint8Array {
  for (let i = 0; i < xs.length; i++) {
    const v = xs[i];
    if (v < 0 || v > 255 || !Number.isInteger(v)) {
      throw new Error("invalid ArrayLike, all elements must be 0-255");
    }
  }

  return Uint8Array.from(xs);
}

export function bytify(bytesLike: BytesLike): Uint8Array {
  if (bytesLike instanceof ArrayBuffer) return new Uint8Array(bytesLike);
  if (bytesLike instanceof Uint8Array) return Uint8Array.from(bytesLike);
  if (typeof bytesLike === "string") return bytifyHex(bytesLike);
  if (Array.isArray(bytesLike)) return bytifyArrayLike(bytesLike);

  throw new Error(`Cannot convert ${bytesLike}`);
}

const HEX_CACHE = Array.from({ length: 256 }).map((_, i) =>
  i.toString(16).padStart(2, "0")
);

/**
 * convert a {@link BytesLike} to an even length hex string prefixed with "0x"
 * @param buf
 * @example
 * hexify([0,1,2,3]) // "0x010203"
 * hexify(Buffer.from([1, 2, 3])) // "0x010203"
 */

export function hexify(buf: BytesLike): string {
  let hex = "";

  const u8a = bytify(buf);
  for (let i = 0; i < u8a.length; i++) {
    hex += HEX_CACHE[u8a[i]];
  }

  return "0x" + hex;
}
