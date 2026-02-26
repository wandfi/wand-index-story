import { defineChain, type Assign, type Chain, type ChainFormatters, type Prettify } from 'viem'
import { arbitrum as _arbitrum, base as _base, berachain as _berachain, bsc as _bsc, monad as _monad, sei as _sei, story as _story } from 'viem/chains'

function mconfigChain<
  formatters extends ChainFormatters,
  const chain extends Chain<formatters>
>(chain: chain): Prettify<Assign<Chain<undefined>, chain>> {
  const rpcUrls: Chain<formatters>['rpcUrls'] = {
    ...chain.rpcUrls
  }
  const urls = process.env?.[`RPC_URL_${chain.id}`]?.split(',')
  if (urls) {
    rpcUrls['custom'] = {
      http: urls,
    }
  }
  return defineChain({
    ...chain,
    rpcUrls,
  }) as unknown as Assign<Chain<undefined>, chain>
}

export const story = mconfigChain({ ..._story, rpcUrls: { default: { http: ['https://mainnet.storyrpc.io'] } } });
export const arbitrum = mconfigChain(_arbitrum);
export const monad = mconfigChain(_monad);

export const apiBatchConfig = { batchSize: 30, wait: 1500 };
export const multicallBatchConfig = { batchSize: 100, wait: 1000 };

export const SUPPORT_CHAINS: readonly [Chain, ...Chain[]] = [arbitrum, monad, story];
