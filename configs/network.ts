import { defineChain } from "viem";
import type { Address, Chain } from "viem";
import { CONFIGS } from ".";
import { arbitrum as arbitrumMain } from "viem/chains";
export const storyTestnet = defineChain({
  id: 1315,
  name: "Story Aeneid Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "IP",
    symbol: "IP",
  },
  rpcUrls: {
    default: { http: ["https://aeneid.storyrpc.io"] },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: "https://aeneid.storyscan.xyz",
    },
  },
  contracts: {
    multicall3: { address: "0xcA11bde05977b3631167028862bE2a173976CA11", blockCreated: 1792 },
  },
  testnet: true,
  fees: {
    baseFeeMultiplier: 1.4,
  },
});
export const story = defineChain({
  id: 1514,
  name: "Story",
  nativeCurrency: {
    decimals: 18,
    name: "IP",
    symbol: "IP",
  },
  rpcUrls: {
    default: { http: ["https://mainnet.storyrpc.io"] },
    others: {
      http: ["https://story-mainnet.g.alchemy.com/v2/7UXJgo01vxWHLJDk09Y0qZct8Y3zMDbX"],
    },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: "https://storyscan.xyz",
    },
  },
  contracts: {
    multicall3: { address: "0xcA11bde05977b3631167028862bE2a173976CA11", blockCreated: 340998 },
  },
  testnet: false,
  fees: {
    baseFeeMultiplier: 1.4,
  },
});

export const sepolia = defineChain({
  id: 11_155_111,
  name: "Sepolia",
  nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://eth-sepolia.public.blastapi.io", "https://eth-sepolia.g.alchemy.com/v2/WddzdzI2o9S3COdT73d5w6AIogbKq4X-"],
    },
  },
  blockExplorers: {
    default: {
      name: "Etherscan",
      url: "https://sepolia.etherscan.io",
      apiUrl: "https://api-sepolia.etherscan.io/api",
    },
  },
  contracts: {
    multicall3: {
      address: "0xca11bde05977b3631167028862be2a173976ca11",
      blockCreated: 751532,
    },
    ensRegistry: { address: "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e" },
    ensUniversalResolver: {
      address: "0xc8Af999e38273D658BE1b921b88A9Ddf005769cC",
      blockCreated: 5_317_080,
    },
  },
  testnet: true,
});
export const arbitrum = defineChain({
  ...arbitrumMain,
  rpcUrls: {
    default: {
      http: ["https://arb-mainnet.g.alchemy.com/v2/7UXJgo01vxWHLJDk09Y0qZct8Y3zMDbX"],
    },
    alchemy: {
      http: ["https://arb-mainnet.g.alchemy.com/v2/7UXJgo01vxWHLJDk09Y0qZct8Y3zMDbX"],
    },
  },
});
export const apiBatchConfig = { batchSize: 30, wait: 1500 };
export const multicallBatchConfig = { batchSize: 100, wait: 1000 };

export const storyChains = [storyTestnet, story];
export const SUPPORT_CHAINS: readonly [Chain, ...Chain[]] = [sepolia, ...storyChains, arbitrum].filter(
  (item) =>
    // isPROD ? !item.testnet : true,
    true
) as any;

export const refChainId: { id: number } = { id: story.id };
export const getCurrentChainId = () => {
  return refChainId.id;
};

export const setCurrentChainId = (id: number) => {
  if (SUPPORT_CHAINS.find((item) => item.id == id)) refChainId.id = id;
};

export function isBerachain() {
  return !!storyChains.find((item) => item.id == getCurrentChainId());
}

export const BEX_URLS: { [k: number]: string } = {
  [storyTestnet.id]: "https://bartio.bex.berachain.com",
};
export const getBexPoolURL = (pool: Address) => `${BEX_URLS[getCurrentChainId()]}/pool/${pool}`;

export const iBGT: Address = "0xac03CABA51e17c86c921E1f6CBFBdC91F8BB2E6b";
