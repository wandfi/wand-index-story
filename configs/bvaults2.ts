import type { Address } from "viem";
import { story } from "./network";
import { DECIMAL } from "@/lib/utils";
import { uniq } from "lodash";

export type Bvault2Config = {
  chain: number;
  vault: Address;
  market: Address;
  bt: Address;
  hook: Address;
  start: bigint;
  decimals: number;
  btPriceUsd: (time: number) => Promise<bigint>;
  underlingApy: (time: number) => Promise<bigint>;
};

export const BVAULT2_CONFIGS: Bvault2Config[] = [
  {
    chain: story.id,
    vault: "0xd589836c3c031e2238c25ad5c6a910794c8827ad",
    market: "0xeDA2Afd24275af1DFBD1e95F29208D7433Fc9C66",
    bt: "0x3bb7dc96832f8f98b8aa2e9f2cc88a111f96a118",
    hook: "0x110477af9ac7837fd0e8a1b917982fd6065eba88",
    start: 6745320n,
    decimals: 18,
    btPriceUsd: async () => DECIMAL,
    underlingApy: async () => BigInt(7e16),
  },
  {
    chain: story.id,
    vault: "0x1e46583d9da2f28cea5d075c57d71d919353b3d9",
    market: "0xBf33a461E88244066e8E2e758E4dB13DC43d9b5a",
    bt: "0x3bb7dc96832f8f98b8aa2e9f2cc88a111f96a118",
    hook: "0x44d1d53433aaa6ab4325f90ee216b18f1ceafa88",
    start: 8142367n,
    decimals: 18,
    btPriceUsd: async () => DECIMAL,
    underlingApy: async () => BigInt(7e16),
  },
];

export const BTS: Address[] = uniq(BVAULT2_CONFIGS.map(item => item.bt))
