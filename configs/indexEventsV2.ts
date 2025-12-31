import type { tables } from "@/db";
import { flatten, uniqBy } from "lodash";
import type { Address } from "viem";
import { aPrioirVC1, ariaVC1, BVAULT2_CONFIGS } from "./bvaults2";

export type IndexEventV2Config = {
  chain: number;
  table: Extract<keyof typeof tables, `eventV2_${string}`>;
  event: string;
  address: Address;
  start: bigint;
  chunk?: bigint;
};

export const INDEX_EVENTV2_CONFIGS = flatten(
  BVAULT2_CONFIGS.map<IndexEventV2Config[]>((item) => [
    {
      chain: item.chain,
      start: item.start,
      table: "eventV2_bvault2_LiquidityAdded",
      event: "event LiquidityAdded(address indexed user, address indexed BT, uint256 amountBT, uint256 amountVPT,uint256 amountShares, uint256 amountPT, uint256 amountYT)",
      address: item.market,
    },
    {
      chain: item.chain,
      start: item.start,
      table: "eventV2_bvault2_SwapBTforPT",
      event: "event SwapBTforPT(address indexed user, address indexed BT, address indexed PT, uint256 amountBT, uint256 amountPT)",
      address: item.vault,
    },
    {
      chain: item.chain,
      start: item.start,
      table: "eventV2_bvault2_SwapBTforYT",
      event: "event SwapBTforYT(address indexed user, address indexed BT, address indexed YT, uint256 maxAmountBT, uint256 amountYT, uint256 amountBTUsed)",
      address: item.vault,
    },
    {
      chain: item.chain,
      start: item.start,
      table: "eventV2_bvault2_MintPTandYT",
      event: "event MintPTandYT(address indexed user, address indexed BT, address PT, address YT, uint256 amount)",
      address: item.vault,
    },
  ])
).concat([
  {
    chain: ariaVC1.chain,
    table: "eventV2_erc20_Transfer",
    event: "event Transfer(address indexed from, address indexed to, uint256 value)",
    address: ariaVC1.bt,
    start: ariaVC1.start,
    chunk: 10000n,
  },
  {
    chain: aPrioirVC1.chain,
    table: "eventV2_erc20_Transfer",
    event: "event Transfer(address indexed from, address indexed to, uint256 value)",
    address: aPrioirVC1.bt,
    start: aPrioirVC1.start,
    chunk: 10000n,
  },
]);
