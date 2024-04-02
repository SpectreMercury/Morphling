export type Uint8ArrayCodec<Unpacked = any, Packable = Unpacked> = Codec<
  Uint8Array,
  Unpacked,
  Packable
>;

export interface Codec<
  Packed,
  Unpacked,
  Packable = Unpacked,
  Unpackable = Packed
> {
  pack: (packable: Packable) => Packed;
  unpack: (unpackable: Unpackable) => Unpacked;
}

export type FixedBytesCodec<Unpacked = any, Packable = Unpacked> = BytesCodec<
  Unpacked,
  Packable
> &
  Fixed;

export type BytesCodec<Unpacked = any, Packable = Unpacked> = Codec<
  Uint8Array,
  Unpacked,
  Packable,
  BytesLike
>;

export type BytesLike = ArrayLike<number> | ArrayBuffer | string;

export type Fixed = {
  readonly __isFixedCodec__: true;
  readonly byteLength: number;
};