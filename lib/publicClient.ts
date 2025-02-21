import { apiBatchConfig, getCurrentChainId, multicallBatchConfig, SUPPORT_CHAINS } from "@/configs/network";
import _ from "lodash";
import { createPublicClient, http, type Chain, type PublicClient } from "viem";

const pcMaps: { [id: number]: { pcs: PublicClient[]; current: number } } = {};

function getRpcurls(chain: Chain){
  const keys = _.keys(chain.rpcUrls)
  return _.flatten(keys.map(item => chain.rpcUrls[item].http))
}

function createPCS(chainId: number) {
  const chain = SUPPORT_CHAINS.find((c) => c.id == chainId)!
  if (!chain) throw `No Chain for chianId:${chainId}`
  const rpcls = getRpcurls(chain) 
  console.info('chainid:',chainId, 'rpcs:', rpcls)
  if(rpcls.length == 0) throw `No Chain rpc for chianId:${chainId}`
  const pcs = rpcls.map((url) => {
    const pc = createPublicClient({
      batch: { multicall: multicallBatchConfig },
      chain: SUPPORT_CHAINS.find((c) => c.id == chainId)!,
      transport: http(url, { batch: apiBatchConfig }),
    });
    const originRead = pc.readContract;
    pc.readContract = async (...args) => {
      try {
        // useReadingCountStore.getState().upReadingCount(1)
        // await isBusy()
        // @ts-ignore
        return await originRead(...args);
      } catch (error) {
        console.error("readError", error, "\nArgs", [...args]);
        throw error;
      } finally {
        // useReadingCountStore.getState().upReadingCount(-1)
      }
    };
    return pc;
  });
  return pcs;
}
export function getPC(chainId: number = getCurrentChainId(), index?: number) {
  if (!pcMaps[chainId]) {
    pcMaps[chainId] = { pcs: createPCS(chainId), current: 0 };
  }
  const item = pcMaps[chainId];
  if (typeof index !== "undefined") {
    if (index >= item.pcs.length) throw "Index error for pcs";
    return item.pcs[index];
  } else {
    const pc = item.pcs[item.current];
    item.current++;
    if (item.current >= item.pcs.length) item.current = 0;
    return pc;
  }
}
