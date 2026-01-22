import { defineChain, type Assign, type Chain, type ChainFormatters, type Prettify } from 'viem'
import { arbitrum as _arbitrum, base as _base, berachain as _berachain, bsc as _bsc, monad as _monad, sei as _sei, story as _story } from 'viem/chains'

function mconfigChain<
  formatters extends ChainFormatters,
  const chain extends Chain<formatters>
>(chain: chain): Prettify<Assign<Chain<undefined>, chain>> {
  const rpcUrls: Chain<formatters>['rpcUrls'] = {
    ...chain.rpcUrls
  }
  const ALCHEMY_API_KEY = process.env['ALCHEMY_API_KEY']
  if (ALCHEMY_API_KEY) {
    const subdommainmap: { [k: number]: string } = {
      [_sei.id]: 'sei-mainnet',
      [_story.id]: 'story-mainnet',
      [_arbitrum.id]: 'arb-mainnet',
      [_base.id]: 'base-mainnet',
      [_bsc.id]: 'bnb-mainnet',
      [_berachain.id]: 'berachain-mainnet',
      [_monad.id]: 'monad-mainnet',
    }
    if (subdommainmap[chain.id]) {
      rpcUrls['alchemy'] = {
        http: [`https://${subdommainmap[chain.id]}.g.alchemy.com/v2/${ALCHEMY_API_KEY}`]
      }
    }
  }
  const ANKR_API_KEY = process.env['ANKR_API_KEY']
  if (ANKR_API_KEY) {
    const netmap: { [k: number]: string } = {
      [_sei.id]: 'sei-evm',
      [_story.id]: 'story-mainnet',
      [_arbitrum.id]: 'arbitrum',
      [_base.id]: 'base',
      [_bsc.id]: 'bsc',
      [_monad.id]: 'monad-mainnet',
      [16661]: '0g_mainnet_evm',
    }
    if (netmap[chain.id]) {
      rpcUrls['ankr'] = {
        http: [`https://rpc.ankr.com/${netmap[chain.id]}/${ANKR_API_KEY}`]
      }
    }
  }
  return defineChain({
    ...chain,
    rpcUrls,
  }) as unknown as Assign<Chain<undefined>, chain>
}

export const story = mconfigChain(_story);
export const arbitrum = mconfigChain(_arbitrum);
export const monad = mconfigChain(_monad);

export const apiBatchConfig = { batchSize: 30, wait: 1500 };
export const multicallBatchConfig = { batchSize: 100, wait: 1000 };

export const SUPPORT_CHAINS: readonly [Chain, ...Chain[]] = [arbitrum, monad, story];
